import { test } from "node:test";
import assert from "node:assert/strict";
import { build } from "esbuild";
import { emptyProject, day } from "../lib/model";
const pid = "11111111-1111-4111-8111-111111111111";
const fid = "22222222-2222-4222-8222-222222222222";
process.env.DATABASE_URL = "postgresql://mock/isolated-tests";
let state: any;
function reset(role = "contractor") {
  const p = emptyProject();
  p.budget = 999999;
  p.transactions = [
    {
      id: "secret",
      kind: "Expense",
      amount: 123456,
      from: "Secret bank",
      party: "Private payee",
      date: day(),
    },
  ];
  p.payments = [
    {
      id: "mine",
      title: "Own bill",
      amount: 123,
      status: "Pending",
      submittedBy: "member",
      account: "Secret bank",
    },
    {
      id: "other",
      title: "Hidden bill",
      amount: 987,
      status: "Pending",
      submittedBy: "someone-else",
    },
  ];
  state = {
    role,
    user: {
      id: role === "owner" ? "owner" : "member",
      name: "Member",
      emailVerified: true,
      email: "member@example.test",
    },
    data: p,
    updates: 0,
    queries: [],
  };
  (globalThis as any).__illamApiTest = state;
  state.query = async (strings: TemplateStringsArray, ...values: any[]) => {
    const q = strings.join("?");
    state.queries.push(q);
    if (q.startsWith("select p.id, case"))
      return state.role === "removed" ? [] : [{ id: pid, role: state.role }];
    if (q.startsWith("select p.id,p.name"))
      return state.role === "removed"
        ? []
        : [
            {
              id: pid,
              name: "Home",
              data: state.data,
              revision: 0,
              role: state.role,
            },
          ];
    if (q.startsWith("select project_id"))
      return [
        {
          project_id: pid,
          name: "private.pdf",
          mime: "application/pdf",
          uploader_id: "other",
        },
      ];
    if (q.startsWith("select data")) return [{ data: state.data, revision: 0 }];
    if (q.startsWith("with changed")) {
      state.updates++;
      state.saved = values.find(
        (v) =>
          typeof v === "string" &&
          v.startsWith("{") &&
          v.includes("transactions"),
      );
      return [{ revision: 1 }];
    }
    throw new Error("Unexpected test query: " + q);
  };
}
const modules = new Map<string, any>();
async function route(path: string) {
  if (modules.has(path)) return modules.get(path);
  const result = await build({
    entryPoints: [path],
    bundle: true,
    platform: "node",
    format: "esm",
    write: false,
    plugins: [
      {
        name: "isolated-auth-and-db",
        setup(b) {
          b.onResolve({ filter: /^server-only$/ }, () => ({
            path: "server-only",
            namespace: "mock",
          }));
          b.onResolve({ filter: /^@neondatabase\/serverless$/ }, () => ({
            path: "neon",
            namespace: "mock",
          }));
          b.onResolve({ filter: /^\.\/auth\/server$/ }, () => ({
            path: "auth",
            namespace: "mock",
          }));
          b.onLoad({ filter: /.*/, namespace: "mock" }, (args) => ({
            contents:
              args.path === "server-only"
                ? ""
                : args.path === "neon"
                  ? "export const neon=()=> (...args)=>globalThis.__illamApiTest.query(...args);"
                  : "export const getAuth=()=>({getSession:async()=>({data:{user:globalThis.__illamApiTest.user},error:null})});",
            loader: "js",
          }));
        },
      },
    ],
  });
  const mod = await import(
    "data:text/javascript;base64," +
      Buffer.from(result.outputFiles[0].text).toString("base64")
  );
  modules.set(path, mod);
  return mod;
}
function request(
  path: string,
  body: any,
  method = "POST",
  origin = "https://illam.test",
) {
  return new Request("https://illam.test/api/" + path, {
    method,
    headers: { "Content-Type": "application/json", Origin: origin },
    body: JSON.stringify(body),
  });
}
test("Actual projects GET redacts team response and blocks unverified/anonymous accounts", async () => {
  const mod = await route("app/api/projects/route.ts");
  reset();
  let response = await mod.GET();
  let body = await response.json();
  assert.equal(body.projects[0].data.payments.length, 1);
  assert.equal(body.projects[0].data.budget, 0);
  assert.ok(!JSON.stringify(body).includes("Secret bank"));
  state.user.emailVerified = false;
  assert.equal((await mod.GET()).status, 403);
  state.user = null;
  assert.equal((await mod.GET()).status, 401);
});
test("Actual project PUT blocks contractor ledger writes before SQL mutation", async () => {
  reset();
  const mod = await route("app/api/projects/route.ts");
  const response = await mod.PUT(
    request("projects", { id: pid, revision: 0, data: state.data }, "PUT"),
  );
  assert.equal(response.status, 403);
  assert.equal(state.updates, 0);
});
test("Actual member endpoint blocks contractor privilege escalation", async () => {
  reset();
  const mod = await route("app/api/members/route.ts");
  assert.equal(
    (
      await mod.POST(
        request("members", {
          projectId: pid,
          email: "other@example.test",
          role: "architect",
        }),
      )
    ).status,
    403,
  );
  assert.equal(
    (
      await mod.GET(
        new Request("https://illam.test/api/members?projectId=" + pid),
      )
    ).status,
    403,
  );
});
test("Actual file download denies another member’s bill and removed memberships", async () => {
  reset();
  const mod = await route("app/api/files/[id]/route.ts");
  assert.equal(
    (
      await mod.GET(new Request("https://illam.test/api/files/" + fid), {
        params: Promise.resolve({ id: fid }),
      })
    ).status,
    403,
  );
  state.role = "removed";
  assert.equal(
    (
      await mod.GET(new Request("https://illam.test/api/files/" + fid), {
        params: Promise.resolve({ id: fid }),
      })
    ).status,
    403,
  );
});
test("Actual team endpoint refuses family submissions, stale revisions and cross-origin writes", async () => {
  reset("family");
  const mod = await route("app/api/team/route.ts");
  const body = {
    projectId: pid,
    revision: 0,
    entry: {
      action: "daily",
      id: crypto.randomUUID(),
      title: "Work",
      note: "Done",
    },
  };
  assert.equal((await mod.POST(request("team", body))).status, 403);
  state.role = "architect";
  assert.equal(
    (await mod.POST(request("team", { ...body, revision: 1 }))).status,
    409,
  );
  assert.equal(
    (await mod.POST(request("team", body, "POST", "https://other.test")))
      .status,
    403,
  );
  assert.equal(state.updates, 0);
});
test("Actual team endpoint accepts a scoped request while preserving ledger", async () => {
  reset();
  const mod = await route("app/api/team/route.ts");
  const response = await mod.POST(
    request("team", {
      projectId: pid,
      revision: 0,
      entry: {
        action: "request",
        id: crypto.randomUUID(),
        requestType: "Payment",
        title: "Temporary shed",
        amount: 1200,
        due: day(),
        category: "Materials",
        status: "Paid",
      },
    }),
  );
  assert.equal(response.status, 200);
  assert.equal(state.updates, 1);
  const saved = JSON.parse(state.saved);
  assert.equal(saved.payments[0].status, "Pending");
  assert.equal(saved.payments[0].submittedBy, "member");
  assert.deepEqual(saved.transactions, state.data.transactions);
  assert.ok(
    state.queries.some(
      (q: string) =>
        q.includes("team.") === false &&
        q.includes("exists(select 1 from illam_members"),
    ),
  );
});
test("Actual owner PUT returns server-stamped approval data", async () => {
  reset("owner");
  const mod = await route("app/api/projects/route.ts");
  const data = {
    ...state.data,
    payments: state.data.payments.map((r: any) =>
      r.id === "mine" ? { ...r, status: "Approved" } : r,
    ),
  };
  const response = await mod.PUT(
    request("projects", { id: pid, revision: 0, data }, "PUT"),
  );
  assert.equal(response.status, 200);
  const result = await response.json();
  assert.equal(result.data.payments[0].reviewedBy, "owner");
  assert.ok(result.data.payments[0].reviewedAt);
  assert.equal(state.updates, 1);
});
