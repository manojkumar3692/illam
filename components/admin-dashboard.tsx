"use client";
import { useEffect, useState, type FormEvent } from "react";
import { ShieldCheck, RefreshCw, ArrowLeft, LogOut } from "lucide-react";
type RecordRow = Record<string, unknown>;
type Overview = {
  users: RecordRow[];
  projects: RecordRow[];
  events: RecordRow[];
  activity: RecordRow[];
  reads: RecordRow[];
};
const empty: Overview = {
  users: [],
  projects: [],
  events: [],
  activity: [],
  reads: [],
};
function display(v: unknown) {
  return v === null || v === undefined
    ? "—"
    : typeof v === "object"
      ? JSON.stringify(v)
      : String(v);
}
function date(v: unknown) {
  return v ? new Date(String(v)).toLocaleString() : "—";
}
function Table({ rows }: { rows: RecordRow[] }) {
  if (!rows.length) return <p className="muted">No records yet.</p>;
  const keys = Array.from(new Set(rows.flatMap((r) => Object.keys(r))));
  return (
    <div className="admin-table-wrap">
      <table className="admin-table">
        <thead>
          <tr>
            {keys.map((k) => (
              <th key={k}>{k.replaceAll("_", " ")}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={String(r.id || i)}>
              {keys.map((k) => (
                <td key={k}>
                  {k.endsWith("_at") ? date(r[k]) : display(r[k])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
export default function AdminDashboard() {
  const [signed, setSigned] = useState(false),
    [checking, setChecking] = useState(true),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [data, setData] = useState<Overview>(empty),
    [tab, setTab] = useState<keyof Overview>("users"),
    [search, setSearch] = useState(""),
    [detail, setDetail] = useState<{
      project: RecordRow;
      members: RecordRow[];
      messages: RecordRow[];
      files: RecordRow[];
    } | null>(null),
    [loaded, setLoaded] = useState("");
  function clear() {
    setSigned(false);
    setData(empty);
    setDetail(null);
  }
  async function api(path: string, method = "GET", body?: unknown) {
    const res = await fetch("/api/admin/" + path, {
      method,
      cache: "no-store",
      headers: { "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : undefined,
    });
    const json = await res.json();
    if (!res.ok) {
      if (res.status === 401) clear();
      throw new Error(json.error || "Unable to load admin data.");
    }
    return json;
  }
  async function refresh() {
    setData(await api("overview"));
    setLoaded(new Date().toLocaleTimeString());
  }
  async function run(fn: () => Promise<void>) {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      await fn();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }
  useEffect(() => {
    let alive = true;
    void (async () => {
      try {
        const res = await fetch("/api/admin/session", { cache: "no-store" });
        if (!alive) return;
        if (res.ok) {
          setSigned(true);
          await refresh();
        } else if (res.status !== 401)
          setError("Admin session check failed. Please refresh.");
      } catch {
        if (alive) setError("Unable to connect. Please refresh.");
      } finally {
        if (alive) setChecking(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);
  useEffect(() => {
    if (!signed) return;
    const timer = setInterval(() => {
      void fetch("/api/admin/session", { cache: "no-store" })
        .then((r) => {
          if (!r.ok) clear();
        })
        .catch(() => clear());
    }, 60000);
    return () => clearInterval(timer);
  }, [signed]);
  async function login(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    await run(async () => {
      await api("session", "POST", {
        email: form.get("email"),
        password: form.get("password"),
      });
      setSigned(true);
      await refresh();
    });
  }
  if (checking)
    return <main className="onboarding-content">Checking admin access…</main>;
  if (!signed)
    return (
      <main className="admin-login onboarding-content">
        <a href="/" className="wordmark">
          illam<span>•</span>
        </a>
        <ShieldCheck size={32} />
        <p className="eyebrow">PRIVATE ADMIN AREA</p>
        <h1>ILLAM Admin</h1>
        <p>This login is separate from home-owner accounts.</p>
        <form onSubmit={login}>
          <label>
            Admin email
            <input type="email" name="email" autoComplete="username" required />
          </label>
          <label>
            Password
            <input
              type="password"
              name="password"
              autoComplete="current-password"
              required
              maxLength={256}
            />
          </label>
          {error && (
            <p className="error-banner" role="alert">
              {error}
            </p>
          )}
          <button className="button primary full" disabled={busy}>
            {busy ? "Signing in…" : "Sign in to admin"}
          </button>
        </form>
        <a href="/" className="text-link">
          Back to ILLAM
        </a>
      </main>
    );
  const filtered = data[tab].filter((r) =>
    JSON.stringify(r).toLowerCase().includes(search.toLowerCase()),
  );
  return (
    <div className="admin-shell">
      <header className="admin-header">
        <a href="/" className="wordmark">
          illam<span>•</span>
        </a>
        <strong>
          <ShieldCheck size={18} /> Admin
        </strong>
        <button className="button" disabled={busy} onClick={() => run(refresh)}>
          <RefreshCw size={16} /> Refresh
        </button>
        <button
          className="button"
          disabled={busy}
          onClick={() =>
            run(async () => {
              await api("session", "DELETE");
              clear();
            })
          }
        >
          <LogOut size={16} /> Sign out
        </button>
      </header>
      <main>
        <p className="eyebrow">ADMIN@ILLAM.COM · READ-ONLY SUPPORT</p>
        <h1>How ILLAM is being used.</h1>
        <p className="muted">
          Private records are visible only after admin sign-in. Every dashboard,
          project and attachment read is audited. Last refreshed {loaded || "—"}
          .
        </p>
        {error && (
          <p className="error-banner" role="alert">
            {error}
          </p>
        )}
        <div className="admin-stats">
          <article>
            <strong>{data.users.length}</strong>
            <span>Accounts</span>
          </article>
          <article>
            <strong>{data.users.filter((u) => !u.verified).length}</strong>
            <span>Awaiting verification</span>
          </article>
          <article>
            <strong>{data.projects.length}</strong>
            <span>Homes created</span>
          </article>
          <article>
            <strong>
              {data.events.filter((e) => e.source !== "test").length}
            </strong>
            <span>Recent error / failed-request events</span>
          </article>
        </div>
        {detail ? (
          <section className="admin-detail">
            <button className="button" onClick={() => setDetail(null)}>
              <ArrowLeft size={16} /> Back to dashboard
            </button>
            <h2>{String(detail.project.name)}</h2>
            <p>
              Full project record · read only. Message and file lists show up to
              1,000 records.
            </p>
            <h3>Project settings</h3>
            <Table
              rows={[
                Object.fromEntries(
                  Object.entries(detail.project.data as RecordRow).filter(
                    ([, v]) => !Array.isArray(v),
                  ),
                ),
              ]}
            />
            {Object.entries(detail.project.data as RecordRow)
              .filter(([, v]) => Array.isArray(v))
              .map(([key, rows]) => (
                <details className="admin-record-section" key={key}>
                  <summary>
                    {key.replaceAll(/([A-Z])/g, " $1")} ·{" "}
                    {(rows as unknown[]).length}
                  </summary>
                  <Table rows={rows as RecordRow[]} />
                </details>
              ))}
            <details className="admin-record-section">
              <summary>Project members · {detail.members.length}</summary>
              <Table rows={detail.members} />
            </details>
            <details className="admin-record-section">
              <summary>Messages · {detail.messages.length}</summary>
              <Table rows={detail.messages} />
            </details>
            <details className="admin-record-section">
              <summary>Bills & attachments · {detail.files.length}</summary>
              {detail.files.map((f) => (
                <p key={String(f.id)}>
                  <a className="text-link" href={"/api/admin/files/" + f.id}>
                    {String(f.name)} · Download
                  </a>
                </p>
              ))}
            </details>
          </section>
        ) : (
          <>
            <nav className="admin-tabs" aria-label="Admin sections">
              {(
                [
                  ["users", "People"],
                  ["projects", "Projects"],
                  ["events", "Errors"],
                  ["activity", "Project activity"],
                  ["reads", "Admin access log"],
                ] as const
              ).map(([key, label]) => (
                <button
                  key={key}
                  className="button"
                  aria-pressed={tab === key}
                  onClick={() => {
                    setTab(key);
                    setSearch("");
                  }}
                >
                  {label}
                </button>
              ))}
            </nav>
            <input
              className="admin-search"
              type="search"
              aria-label="Search admin records"
              placeholder="Search names, emails, projects or events…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {tab === "users" && (
              <>
                <p className="muted">
                  Newest 500 accounts. Test accounts remain labelled.
                  Verification and project counts show setup progress, not every
                  page visited.
                </p>
                <Table
                  rows={filtered.map((u) => ({
                    name: u.name,
                    email: u.email,
                    status: !u.verified
                      ? "Awaiting email verification"
                      : Number(u.owned_projects) > 0
                        ? "Home created"
                        : Number(u.memberships) > 0
                          ? "Invited to project"
                          : "Verified · no project yet",
                    homes: u.owned_projects,
                    memberships: u.memberships,
                    created_at: u.created_at,
                    test:
                      String(u.email).endsWith(".example") ||
                      u.email === "demo@illam.com"
                        ? "Test account"
                        : "",
                  }))}
                />
              </>
            )}
            {tab === "projects" && (
              <>
                <p className="muted">
                  Latest 500 projects. Counts reflect current records;
                  archive/history details are inside each project.
                </p>
                <div className="admin-projects">
                  {filtered.map((p) => (
                    <article key={String(p.id)}>
                      <h2>{String(p.name)}</h2>
                      <p>{String(p.owner_email)}</p>
                      <p>
                        {String(p.transactions)} ledger entries ·{" "}
                        {String(p.stages)} stages · {String(p.notes)} notes ·{" "}
                        {String(p.requests)} payment requests
                      </p>
                      <small>Updated {date(p.updated_at)}</small>
                      <button
                        className="button"
                        disabled={busy}
                        onClick={() =>
                          run(async () => {
                            setDetail(await api("projects/" + p.id));
                          })
                        }
                      >
                        View private records
                      </button>
                    </article>
                  ))}
                </div>
              </>
            )}
            {tab === "events" && (
              <>
                <p className="muted">
                  Latest 200 events, starting with this release. Browser reports
                  require an app session; anonymous browser errors are not
                  stored. Auth failures are anonymous. HTTP events can include
                  validation failures, not just crashes. One incident may have a
                  browser and server event. Logs contain no passwords, request
                  bodies, bill contents or raw exception text.
                </p>
                <button
                  className="button"
                  disabled={busy}
                  onClick={() =>
                    run(async () => {
                      await api("test", "POST");
                      await refresh();
                    })
                  }
                >
                  Send monitoring test
                </button>
                <Table rows={filtered} />
              </>
            )}
            {tab === "activity" && (
              <>
                <p className="muted">
                  Latest 200 recorded project actions. Some historical actions
                  were not logged.
                </p>
                <Table rows={filtered} />
              </>
            )}
            {tab === "reads" && (
              <>
                <p className="muted">
                  Latest 100 admin sign-ins, reads and downloads. Times are
                  shown in your device timezone.
                </p>
                <Table rows={filtered} />
              </>
            )}
          </>
        )}
      </main>
    </div>
  );
}
