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

test("Messages reject non-workers and cross-origin writes", async () => {
  const api = await route("app/api/messages/route.ts");
  reset("family");
  const get = await api.GET(
    new Request("https://illam.test/api/messages?projectId=" + pid),
  );
  assert.equal(get.status, 403);
  const post = await api.POST(
    new Request("https://illam.test/api/messages", {
      method: "POST",
      headers: {
        origin: "https://evil.test",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        projectId: pid,
        recipientId: "owner",
        body: "Hi",
      }),
    }),
  );
  assert.equal(post.status, 403);
});
test("Message read is scoped to authenticated participants; send uses server sender and atomic membership check", async () => {
  const api = await route("app/api/messages/route.ts");
  reset("architect");
  const original = state.query;
  let sent: any[] = [];
  let reads: any[] = [];
  state.query = async (strings: TemplateStringsArray, ...values: any[]) => {
    const q = strings.join("?");
    if (q.startsWith("select p.owner_id"))
      return [{ id: "owner", name: "Owner", role: "owner" }];
    if (q.startsWith("select id,sender_id")) {
      reads = values;
      assert.match(q, /sender_id=\? or recipient_id=\?/);
      return [];
    }
    if (q.startsWith("insert into illam_messages")) {
      sent = values;
      assert.match(q, /join illam_members/);
      assert.match(q, /p.owner_id=\? and m.user_id=\?/);
      return values.includes("other-worker") ? [] : [{ id: fid }];
    }
    return original(strings, ...values);
  };
  const get = await api.GET(
    new Request("https://illam.test/api/messages?projectId=" + pid),
  );
  assert.equal(get.status, 200);
  assert.deepEqual(reads, [pid, "member", "member"]);
  const request = (recipientId: string) =>
    new Request("https://illam.test/api/messages", {
      method: "POST",
      headers: {
        origin: "https://illam.test",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        projectId: pid,
        recipientId,
        senderId: "forged-owner",
        body: "Question about tomorrow",
      }),
    });
  assert.equal((await api.POST(request("owner"))).status, 201);
  assert.ok(sent.includes("member"));
  assert.ok(!sent.includes("forged-owner"));
  assert.equal((await api.POST(request("other-worker"))).status, 403);
});

test("Material action API stamps actor, keeps finances intact and rejects stale revisions", async () => {
  const api = await route("app/api/materials/route.ts");
  reset("contractor");
  state.data.materials = [
    {
      id: "cement",
      title: "Cement",
      unit: "bags",
      received: 0,
      used: 0,
      reorder: 20,
    },
  ];
  const entry = {
    action: "request",
    id: "request-1",
    materialId: "cement",
    quantity: 10,
    neededBy: day(),
    status: "Approved",
    person: "Forged",
    by: "owner",
  };
  const stale = await api.POST(
    request("materials", { projectId: pid, revision: 8, entry }),
  );
  assert.equal(stale.status, 409);
  const result = await api.POST(
    request("materials", { projectId: pid, revision: 0, entry }),
  );
  assert.equal(result.status, 200);
  const saved = JSON.parse(state.saved);
  assert.equal(saved.materialRequests[0].status, "Requested");
  assert.equal(saved.materialRequests[0].by, "member");
  assert.equal(saved.materialRequests[0].person, "Member");
  assert.deepEqual(saved.transactions, state.data.transactions);
});
test("Material API rejects family and worker approvals; generic project PUT cannot overwrite stock history", async () => {
  const api = await route("app/api/materials/route.ts");
  reset("family");
  assert.equal(
    (
      await api.POST(
        request("materials", {
          projectId: pid,
          revision: 0,
          entry: { action: "threshold", materialId: "cement", reorder: 5 },
        }),
      )
    ).status,
    403,
  );
  reset("contractor");
  assert.equal(
    (
      await api.POST(
        request("materials", {
          projectId: pid,
          revision: 0,
          entry: { action: "review", requestId: "r", status: "Approved" },
        }),
      )
    ).status,
    400,
  );
  assert.equal(state.updates, 0);
  reset("owner");
  state.data.materialMovements = [
    {
      id: "delivery",
      materialId: "cement",
      kind: "Delivery",
      quantity: 10,
      delta: 10,
    },
  ];
  const projects = await route("app/api/projects/route.ts");
  const result = await projects.PUT(
    request(
      "projects",
      { id: pid, revision: 0, data: { ...state.data, materialMovements: [] } },
      "PUT",
    ),
  );
  assert.equal(result.status, 400);
  assert.equal(state.updates, 0);
});
