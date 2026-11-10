"use client";
import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  ArrowDownLeft,
  ArrowUpRight,
  ArrowRight,
  ArrowLeftRight,
  LayoutDashboard,
  Wallet,
  ClipboardCheck,
  Layers,
  Package,
  Users,
  Camera,
  FileText,
  Settings,
  Plus,
  Search,
  ChevronDown,
  Check,
  Clock,
  Download,
  X,
  Menu,
  ArrowLeft,
  ChevronRight,
  HardHat,
  MoreHorizontal,
  Smartphone,
  House,
  Leaf,
  LogOut,
  ExternalLink,
  Trash2,
  Pencil,
  RefreshCw,
  ShieldCheck,
  Video,
  AlertCircle,
} from "lucide-react";
import {
  day,
  accountBalances,
  demoProject,
  emptyProject,
  finances,
  money,
  safeUrl,
  settlePayment,
  validateRow,
  type Project,
  type Row,
  type Section,
} from "@/lib/model";
import { fields, labels, type Field } from "@/lib/fields";
import { authClient } from "@/lib/auth/client";
import AppInstall from "@/components/app-install";
import QuickMoneyForm from "@/components/quick-money-form";
import ImportExpenses from "@/components/import-expenses";
import QuickSiteForm from "@/components/quick-site-form";
type View = "overview" | Section | "settings" | "more";
type CloudProject = {
  id: string;
  name: string;
  data: Project;
  revision: number;
  role: string;
};
const icons = {
  overview: LayoutDashboard,
  transactions: Wallet,
  payments: ClipboardCheck,
  stages: Layers,
  materials: Package,
  people: Users,
  updates: Camera,
  decisions: Check,
  documents: FileText,
  cameras: Video,
  settings: Settings,
  more: MoreHorizontal,
};
function dateLabel(value: string) {
  if (!value) return "No date";
  if (value === day()) return "Today";
  const d = new Date(value + "T12:00:00");
  return Number.isNaN(d.getTime())
    ? value
    : new Intl.DateTimeFormat("en-IN", {
        day: "numeric",
        month: "short",
      }).format(d);
}
const STORAGE = "illam-demo-v1";
async function api(path: string, method = "GET", body?: unknown) {
  const res = await fetch("/api/" + path, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json();
  if (!res.ok)
    throw new Error(data.error || "Request failed. Please try again.");
  return data;
}
function Badge({
  children,
  tone = "neutral",
}: {
  children: React.ReactNode;
  tone?: string;
}) {
  return <span className={"badge " + tone}>{children}</span>;
}
function Empty({ title, onAdd }: { title: string; onAdd?: () => void }) {
  return (
    <div className="empty">
      <Plus size={28} />
      <h3>Nothing here yet</h3>
      <p>{title}</p>
      {onAdd && (
        <button className="button primary" onClick={onAdd}>
          <Plus size={16} /> Add your first entry
        </button>
      )}
    </div>
  );
}
export default function Illam() {
  const [project, setProject] = useState<Project>(emptyProject());
  const [ready, setReady] = useState(false);
  const [mode, setMode] = useState<"demo" | "cloud">("demo");
  const [view, setView] = useState<View>("overview");
  const [search, setSearch] = useState("");
  const [importOpen, setImportOpen] = useState(false);
  const [quickAdd, setQuickAdd] = useState(false);
  const [online, setOnline] = useState(true);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const locked = useRef(false);
  const [modal, setModal] = useState<{
    section: Section;
    row?: Row;
    defaults?: Partial<Row>;
  } | null>(null);
  const [authOpen, setAuthOpen] = useState(false);
  const [signup, setSignup] = useState(false);
  const [verifyEmail, setVerifyEmail] = useState("");
  const [resetStep, setResetStep] = useState<"none" | "email" | "code">("none");
  const [resetEmail, setResetEmail] = useState("");
  const [user, setUser] = useState<{ email: string; id: string } | null>(null);
  const [configured, setConfigured] = useState(false);
  const [projects, setProjects] = useState<CloudProject[]>([]);
  const [active, setActive] = useState<CloudProject | null>(null);
  const [members, setMembers] = useState<Row[]>([]);
  const [deleteRow, setDeleteRow] = useState<{
    section: Section;
    row: Row;
  } | null>(null);
  const fmt = (v: number) => money(v, project.currency);
  const f = finances(project);
  const editable = mode === "demo" || (!!active && active.role !== "viewer");
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE);
      setProject(saved ? JSON.parse(saved) : demoProject());
    } catch {
      setProject(demoProject());
      setError("Could not read the saved demo. Showing sample data.");
    }
    const auth = new URLSearchParams(window.location.search).get("auth");
    if (auth) {
      setSignup(auth === "signup");
      setAuthOpen(true);
    }
    api("session")
      .then(async (r) => {
        setConfigured(r.configured);
        if (r.user) {
          setUser(r.user);
          setAuthOpen(false);
          await loadCloud();
        } else if (!auth && new URLSearchParams(window.location.search).get("demo") !== "1") {
          window.location.replace("/");
          return;
        }
        setReady(true);
      })
      .catch((e) => { setError(e.message); setReady(true); });
  }, []);
  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(""), 4500);
    return () => clearTimeout(t);
  }, [notice]);
  useEffect(() => {
    const fn = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setModal(null);
        setAuthOpen(false);
        setDeleteRow(null);
        setQuickAdd(false);
      }
    };
    window.addEventListener("keydown", fn);
    return () => window.removeEventListener("keydown", fn);
  }, []);
  useEffect(() => {
    const views: View[] = [
      "overview",
      "transactions",
      "payments",
      "stages",
      "materials",
      "people",
      "updates",
      "decisions",
      "documents",
      "cameras",
      "settings",
      "more",
    ];
    const onHash = () => {
      const next = location.hash.slice(1) as View;
      if (views.includes(next)) {
        setView(next);
        setSearch("");
      } else setView("overview");
    };
    const connection = () => setOnline(navigator.onLine);
    onHash();
    connection();
    window.addEventListener("hashchange", onHash);
    window.addEventListener("online", connection);
    window.addEventListener("offline", connection);
    return () => {
      window.removeEventListener("hashchange", onHash);
      window.removeEventListener("online", connection);
      window.removeEventListener("offline", connection);
    };
  }, []);
  async function loadCloud(id?: string) {
    const result = await api("projects");
    setProjects(result.projects);
    const current =
      result.projects.find((p: CloudProject) => p.id === id) ||
      result.projects[0];
    setMode("cloud");
    setActive(current || null);
    setProject(current?.data || emptyProject());
    if (current) {
      const m = await api("members?projectId=" + current.id);
      setMembers(m.members);
    } else setMembers([]);
  }
  async function save(next: Project) {
    if (!editable) throw new Error("This project is read-only.");
    if (mode === "cloud" && !navigator.onLine)
      throw new Error(
        "You are offline. Keep this form open and reconnect to save.",
      );
    if (mode === "demo") {
      localStorage.setItem(STORAGE, JSON.stringify(next));
    } else {
      if (!active) throw new Error("Create your home project first.");
      const r = await api("projects", "PUT", {
        id: active.id,
        revision: active.revision,
        data: next,
      });
      setActive({ ...active, revision: r.revision, data: next });
    }
    setProject(next);
    setNotice(mode === "demo" ? "Saved on this browser" : "Saved to your home");
  }
  async function run(fn: () => Promise<void>) {
    if (locked.current) return;
    locked.current = true;
    setBusy(true);
    setError("");
    try {
      await fn();
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Something went wrong. Please try again.",
      );
    } finally {
      setBusy(false);
      locked.current = false;
    }
  }
  function navigate(next: View) {
    setView(next);
    setSearch("");
    window.location.hash = next;
    window.scrollTo({ top: 0, behavior: "instant" });
  }
  function add(section: Section, defaults?: Partial<Row>) {
    setError("");
    setQuickAdd(false);
    setModal({ section, defaults });
  }
  async function rowSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    await run(async () => {
      if (!modal) return;
      const values = new FormData(form);
      const row: Row = {
        ...modal.row,
        id: modal.row?.id || crypto.randomUUID(),
      };
      fields[modal.section].forEach((field) => {
        row[field.key] =
          field.type === "number"
            ? Number(values.get(field.key) || 0)
            : String(values.get(field.key) || "").trim();
      });
      if (
        !modal.row &&
        (modal.section === "payments" || modal.section === "decisions")
      )
        row.status = "Pending";
      validateRow(modal.section, row);
      const file = values.get("file");
      if (file instanceof File && file.size) {
        if (mode !== "cloud" || !active)
          throw new Error(
            "Sign in to a real project to upload private files. Demo entries can use HTTPS links.",
          );
        if (file.size > 3 * 1024 * 1024)
          throw new Error("Please choose a file smaller than 3 MB.");
        const data = new FormData();
        data.set("file", file);
        data.set("projectId", active.id);
        const response = await fetch("/api/files", {
          method: "POST",
          body: data,
        });
        const out = await response.json();
        if (!response.ok) throw new Error(out.error);
        row.fileId = out.id;
        row.fileName = file.name;
      }
      if (modal.section === "documents" && !row.url && !row.fileId)
        throw new Error("Add a document link or upload a file.");
      const rows = modal.row
        ? project[modal.section].map((r) => (r.id === row.id ? row : r))
        : [row, ...project[modal.section]];
      await save({ ...project, [modal.section]: rows });
      setModal(null);
    });
  }
  function status(section: Section, row: Row, value: string) {
    run(async () => {
      await save({
        ...project,
        [section]: project[section].map((r) =>
          r.id === row.id ? { ...r, status: value } : r,
        ),
      });
    });
  }
  function download(format: "json" | "csv") {
    let content = JSON.stringify(project, null, 2),
      type = "application/json";
    if (format === "csv") {
      const cols = [
        "date",
        "kind",
        "party",
        "category",
        "amount",
        "from",
        "to",
        "note",
      ];
      const escape = (v: unknown) => {
        let s = String(v ?? "");
        if (/^[=+@\-\t\r]/.test(s)) s = "'" + s;
        return '"' + s.replaceAll('"', '""') + '"';
      };
      content = [
        cols.join(","),
        ...project.transactions.map((r) =>
          cols.map((c) => escape(r[c])).join(","),
        ),
      ].join("\r\n");
      type = "text/csv";
    }
    const url = URL.createObjectURL(new Blob([content], { type }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "illam-" + day() + "." + format;
    link.click();
    URL.revokeObjectURL(url);
  }
  async function authenticate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    await run(async () => {
      if (!configured)
        throw new Error(
          "Database connection is not configured on this deployment yet.",
        );
      const credentials = {
        email: String(form.get("email")),
        password: String(form.get("password")),
      };
      const result = signup
        ? await authClient.signUp.email({
            ...credentials,
            name: String(form.get("name")),
          })
        : await authClient.signIn.email(credentials);
      if (result.error) {
        if (result.error.code === "EMAIL_NOT_VERIFIED") {
          setVerifyEmail(credentials.email);
          setNotice("Enter the verification code sent to your email.");
          return;
        }
        throw new Error(result.error.message || "Unable to sign in.");
      }
      const session = await api("session");
      if (!session.user) {
        setVerifyEmail(credentials.email);
        setNotice("Check your email for the verification code.");
        return;
      }
      setUser(session.user);
      await loadCloud();
      setAuthOpen(false);
    });
  }
  async function newHome() {
    await run(async () => {
      const data = emptyProject();
      const r = await api("projects", "POST", { data });
      await loadCloud(r.id);
      setView("settings");
    });
  }
  const title =
    view === "overview"
      ? "Home"
      : view === "settings"
        ? "Project settings"
        : view === "more"
          ? "More"
          : labels[view];
  const pending =
    project.payments.filter((r) => r.status === "Pending").length +
    project.decisions.filter((r) => r.status === "Pending").length;
  const currentStage = project.stages.find(
    (r) => Number(r.progress) > 0 && Number(r.progress) < 100,
  );
  function recordActions(section: Section, row: Row) {
    return (
      editable && (
        <div className="row-actions">
          <button
            className="icon-button"
            aria-label={"Edit " + String(row.title || row.party)}
            onClick={() => setModal({ section, row })}
            disabled={
              busy ||
              (section === "payments" && row.status === "Paid") ||
              !!row.paymentId
            }
          >
            <Pencil size={15} />
          </button>
          <button
            className="icon-button danger"
            aria-label={"Delete " + String(row.title || row.party)}
            onClick={() => setDeleteRow({ section, row })}
            disabled={
              busy ||
              (section === "payments" && row.status === "Paid") ||
              !!row.paymentId
            }
          >
            <Trash2 size={15} />
          </button>
        </div>
      )
    );
  }
  function linkFor(row: Row) {
    const href = row.fileId
      ? "/api/files/" + row.fileId
      : row.url
        ? safeUrl(String(row.url))
        : null;
    return href ? (
      <a
        className="text-link"
        href={href}
        target="_blank"
        rel="noopener noreferrer"
      >
        Open {row.fileId ? "file" : "link"} <ExternalLink size={14} />
      </a>
    ) : null;
  }
  function paymentCard(row: Row) {
    return (
      <div className="payment-row" key={row.id}>
        <div className="mini-icon">
          <ArrowUpRight size={19} />
        </div>
        <div className="grow">
          <strong>{row.title}</strong>
          <small>
            {row.party} · Due {row.due}
          </small>
        </div>
        <div className="align-right">
          <strong>{fmt(Number(row.amount))}</strong>
          <Badge
            tone={
              row.status === "Approved"
                ? "green"
                : row.status === "Paid"
                  ? "neutral"
                  : "amber"
            }
          >
            {row.status}
          </Badge>
        </div>
      </div>
    );
  }
  function sectionContent(section: Section) {
    const rows = project[section].filter((r) =>
      Object.values(r).some((v) =>
        String(v).toLowerCase().includes(search.toLowerCase()),
      ),
    );
    if (!rows.length)
      return (
        <Empty
          title={
            search
              ? "No entries match your search."
              : "Add your first " + labels[section].toLowerCase() + " entry."
          }
          onAdd={editable && !search ? () => add(section) : undefined}
        />
      );
    if (section === "transactions")
      return (
        <div className="ledger-list">
          {[...rows]
            .sort((a, b) => String(b.date).localeCompare(String(a.date)))
            .map((r) => (
              <details className="ledger-entry" key={r.id}>
                <summary>
                  <span
                    className={
                      "entry-icon " +
                      (r.kind === "Contribution" ? "incoming" : "")
                    }
                  >
                    {r.kind === "Contribution" ? (
                      <ArrowDownLeft size={20} />
                    ) : r.kind === "Transfer" ? (
                      <ArrowLeftRight size={20} />
                    ) : (
                      <ArrowUpRight size={20} />
                    )}
                  </span>
                  <span className="grow">
                    <strong>{r.party}</strong>
                    <small>
                      {r.category} · {dateLabel(String(r.date))}
                    </small>
                  </span>
                  <span
                    className={
                      "entry-amount " +
                      (r.kind === "Contribution" ? "positive" : "")
                    }
                  >
                    {r.kind === "Contribution"
                      ? "+"
                      : r.kind === "Expense"
                        ? "−"
                        : ""}
                    {fmt(Number(r.amount))}
                    <small>
                      {r.kind === "Contribution" ? "Money added" : r.kind}
                    </small>
                  </span>
                  <ChevronDown size={15} />
                </summary>
                <div className="entry-details">
                  <p>{r.note || "No note added"}</p>
                  <small>
                    {r.kind === "Contribution"
                      ? "To " + r.to
                      : r.kind === "Transfer"
                        ? r.from + " → " + r.to
                        : "Paid from " + r.from}
                  </small>
                  {recordActions(section, r)}
                </div>
              </details>
            ))}
        </div>
      );
    if (section === "stages")
      return (
        <div className="stage-list">
          {rows.map((r, i) => (
            <article className="stage-item" key={r.id}>
              <span
                className={
                  "stage-number " + (Number(r.progress) === 100 ? "done" : "")
                }
              >
                {Number(r.progress) === 100 ? (
                  <Check size={18} />
                ) : (
                  String(i + 1).padStart(2, "0")
                )}
              </span>
              <div className="grow">
                <div className="spread">
                  <h3>{r.title}</h3>
                  <Badge
                    tone={Number(r.progress) === 100 ? "green" : "neutral"}
                  >
                    {r.progress}% complete
                  </Badge>
                </div>
                <p>
                  {r.owner} · Target {r.due}
                </p>
                <div className="progress">
                  <span style={{ width: r.progress + "%" }} />
                </div>
                <small>{r.note}</small>
                <small>Uncommitted estimate: {fmt(Number(r.remaining))}</small>
              </div>
              {recordActions(section, r)}
            </article>
          ))}
        </div>
      );
    if (section === "materials")
      return (
        <div className="card-grid">
          {rows.map((r) => {
            const left = Number(r.received) - Number(r.used),
              low = left <= Number(r.reorder);
            return (
              <article className="item-card" key={r.id}>
                <div className="spread">
                  <Package className="muted" size={23} />
                  <Badge tone={low ? "amber" : "green"}>
                    {low ? "Running low" : "In stock"}
                  </Badge>
                </div>
                <h3>{r.title}</h3>
                <p>{r.vendor}</p>
                <div className="stock-number">
                  {left.toLocaleString()} <small>{r.unit} available</small>
                </div>
                <div className="progress">
                  <span
                    style={{
                      width:
                        (Number(r.received)
                          ? Math.max(0, (left / Number(r.received)) * 100)
                          : 0) + "%",
                      background: low ? "#c1934f" : undefined,
                    }}
                  />
                </div>
                <div className="spread">
                  <small>
                    {r.received} received · {r.used} used
                  </small>
                  {recordActions(section, r)}
                </div>
              </article>
            );
          })}
        </div>
      );
    return (
      <div
        className={"card-grid " + (section === "updates" ? "diary-grid" : "")}
      >
        {rows.map((r) => (
          <article className="item-card" key={r.id}>
            <div className="spread">
              {section === "people" ? (
                <div className="avatar">
                  {String(r.title)
                    .split(" ")
                    .map((s) => s[0])
                    .slice(0, 2)
                    .join("")}
                </div>
              ) : section === "cameras" ? (
                <Video className="muted" />
              ) : section === "documents" ? (
                <FileText className="muted" />
              ) : (
                <Badge
                  tone={
                    r.status === "Approved"
                      ? "green"
                      : r.status === "Pending"
                        ? "amber"
                        : "neutral"
                  }
                >
                  {r.status || r.date || r.category}
                </Badge>
              )}
              {recordActions(section, r)}
            </div>
            <h3>{r.title}</h3>
            {r.party && <p>{r.party}</p>}
            {r.amount !== undefined && (
              <div className="card-amount">{fmt(Number(r.amount))}</div>
            )}
            {r.due && (
              <small>
                Due {r.due}
                {r.owner ? " · " + r.owner : ""}
              </small>
            )}
            {r.note && <p className="note">{r.note}</p>}
            {section === "people" && (
              <>
                <Badge>{r.role}</Badge>
                <p>{r.company}</p>
                {r.phone && <p>{r.phone}</p>}
                {r.email && <p>{r.email}</p>}
              </>
            )}
            {section === "updates" && (
              <div className="diary-footer">
                <span>{r.author}</span>
                <span>
                  <Users size={14} /> {r.workers} on site
                </span>
              </div>
            )}
            {section === "documents" && (
              <p>
                {r.category} · Revision {r.version}
              </p>
            )}
            {linkFor(r)}
            {(section === "payments" || section === "decisions") &&
              editable && (
                <div className="card-buttons">
                  {r.status === "Pending" && (
                    <>
                      <button
                        disabled={busy}
                        className="button primary small"
                        onClick={() => status(section, r, "Approved")}
                      >
                        <Check size={15} /> Approve
                      </button>
                      <button
                        disabled={busy}
                        className="button small"
                        onClick={() => status(section, r, "Rejected")}
                      >
                        Reject
                      </button>
                    </>
                  )}
                  {section === "payments" && r.status === "Approved" && (
                    <button
                      disabled={busy}
                      className="button primary small"
                      onClick={() =>
                        run(async () => {
                          await save(settlePayment(project, r.id));
                        })
                      }
                    >
                      Record as paid <ArrowRight size={15} />
                    </button>
                  )}
                  {section === "decisions" && r.status === "Approved" && (
                    <small>
                      Approved decision. Create a payment request separately if
                      needed.
                    </small>
                  )}
                </div>
              )}
          </article>
        ))}
      </div>
    );
  }
  if (!ready)
    return (
      <div className="loading">
        <House size={32} />
        <span>Opening your home…</span>
      </div>
    );
  const moneyViews: View[] = ["transactions", "payments"];
  const siteViews: View[] = ["updates", "stages", "materials"];
  const group = moneyViews.includes(view)
    ? "money"
    : siteViews.includes(view)
      ? "site"
      : view === "overview"
        ? "home"
        : "more";
  const lowStock = project.materials.filter(
    (r) => Number(r.received) - Number(r.used) <= Number(r.reorder),
  );
  const actionTitle: Record<Section, string> = {
    transactions: "Add expense",
    payments: "Request payment",
    stages: "Add stage",
    materials: "Add material",
    people: "Add person",
    updates: "Post update",
    decisions: "Add decision",
    documents: "Add document",
    cameras: "Add camera",
  };
  return (
    <div className="app-shell">
      <header className="app-header">
        <button
          className="wordmark"
          onClick={() => navigate("overview")}
          aria-label="ILLAM home"
        >
          illam<span>•</span>
        </button>
        <button className="home-switch" onClick={() => navigate("settings")}>
          <span>{project.name}</span>
          <ChevronDown size={16} />
        </button>
        <button
          className="icon-button"
          aria-label="Refresh project"
          disabled={busy}
          onClick={() =>
            mode === "cloud"
              ? run(() => loadCloud(active?.id))
              : setNotice("Demo entries are saved on this phone.")
          }
        >
          <RefreshCw size={19} />
        </button>
      </header>
      <main id="main-content">
        <div className="content">
          {mode === "demo" && (
            <div className="demo-banner">
              <span>Trying a sample home</span>
              <button
                onClick={() =>
                  user ? run(() => loadCloud()) : setAuthOpen(true)
                }
              >
                Start your home <ArrowRight size={15} />
              </button>
            </div>
          )}
          {!online && (
            <div className="info-note" role="status">
              You’re offline.{" "}
              {mode === "cloud"
                ? "Reconnect before saving changes."
                : "Demo changes are saved on this device."}
            </div>
          )}
          {error && (
            <div className="error-banner" role="alert">
              <AlertCircle size={18} />
              <span>{error}</span>
              <button
                className="icon-button"
                aria-label="Dismiss error"
                onClick={() => setError("")}
              >
                <X size={18} />
              </button>
            </div>
          )}
          <div className="page-heading">
            <div>
              {view === "overview" ? (
                <>
                  <p className="today-date">
                    {new Intl.DateTimeFormat("en-IN", {
                      weekday: "long",
                      day: "numeric",
                      month: "long",
                      timeZone: "Asia/Kolkata",
                    }).format(new Date())}
                  </p>
                  <h1>Your site, today.</h1>
                </>
              ) : (
                <>
                  <button
                    className="back-link"
                    onClick={() =>
                      navigate(
                        group === "more" && view !== "more"
                          ? "more"
                          : "overview",
                      )
                    }
                  >
                    <ArrowLeft size={17} />{" "}
                    {group === "more" && view !== "more" ? "More" : "Home"}
                  </button>
                  <h1>
                    {group === "money"
                      ? "Money"
                      : group === "site"
                        ? "Site"
                        : title}
                  </h1>
                </>
              )}
            </div>
            {view === "overview" ? (
              <span className="site-tag">
                <span />
                {currentStage
                  ? "Building"
                  : project.stages.length
                    ? "My home"
                    : "Ground zero"}
              </span>
            ) : view !== "more" && view !== "settings" && editable ? (
              <button
                className="add-button"
                onClick={() => add(view as Section)}
                aria-label={actionTitle[view as Section]}
              >
                <Plus size={22} />
              </button>
            ) : null}
          </div>
          {group === "money" && (
            <div className="section-tabs" aria-label="Money sections">
              {(["transactions", "payments"] as Section[]).map((v) => (
                <button
                  key={v}
                  onClick={() => navigate(v)}
                  className={view === v ? "selected" : ""}
                  aria-current={view === v ? "page" : undefined}
                >
                  {v === "transactions" ? "All entries" : "Payments due"}
                  {v === "payments" &&
                    project.payments.some((r) => r.status === "Pending") && (
                      <span className="tab-dot" />
                    )}
                </button>
              ))}
            </div>
          )}
          {group === "site" && (
            <div className="section-tabs" aria-label="Site sections">
              {(["updates", "stages", "materials"] as Section[]).map((v) => (
                <button
                  key={v}
                  onClick={() => navigate(v)}
                  className={view === v ? "selected" : ""}
                  aria-current={view === v ? "page" : undefined}
                >
                  {v === "updates"
                    ? "Site diary"
                    : v === "stages"
                      ? "Work plan"
                      : "Materials"}
                </button>
              ))}
            </div>
          )}
          {mode === "cloud" && !active ? (
            <section className="welcome">
              <HardHat size={40} />
              <h2>Let’s set up your home.</h2>
              <p>
                Start with your budget. Add payments and site updates as you go.
              </p>
              <button
                disabled={busy}
                className="button primary"
                onClick={newHome}
              >
                <Plus size={20} /> Create my home
              </button>
            </section>
          ) : (
            <>
              {view === "overview" && (
                <>
                  <section
                    className="balance-block"
                    aria-label="Construction funds"
                  >
                    <div className="balance-label">
                      Money available{" "}
                      <button
                        onClick={() => navigate("transactions")}
                        aria-label="View money details"
                      >
                        <ArrowUpRight size={20} />
                      </button>
                    </div>
                    <div
                      className={
                        "main-balance " + (f.available < 0 ? "negative" : "")
                      }
                    >
                      {fmt(f.available)}
                    </div>
                    <div className="balance-split">
                      <div>
                        <span>Spent so far</span>
                        <strong>{fmt(f.spent)}</strong>
                      </div>
                      <div>
                        <span>Total budget</span>
                        <strong>{fmt(project.budget)}</strong>
                      </div>
                    </div>
                  </section>
                  {editable && (
                    <div className="quick-actions">
                      <button
                        className="button primary"
                        onClick={() => add("transactions", { kind: "Expense" })}
                      >
                        <Plus size={20} /> Add expense
                      </button>
                      <button className="button" onClick={() => add("updates")}>
                        <Camera size={20} /> Site update
                      </button>
                    </div>
                  )}
                  <section className="funding-note">
                    <div className="funding-sign">
                      <Wallet size={21} />
                    </div>
                    <div className="grow">
                      <h2>
                        {f.topup
                          ? `Plan to add ${fmt(f.topup)}`
                          : "Funds cover the next 14 days"}
                      </h2>
                      <p>
                        {f.topup
                          ? "For payments coming up in the next 14 days."
                          : "Based on the payments recorded so far."}
                      </p>
                      <details>
                        <summary>How is this calculated?</summary>
                        <p>
                          {fmt(f.due)} due + {fmt(project.reserve)} reserve −{" "}
                          {fmt(f.available)} available. Includes pending and
                          overdue requests.
                        </p>
                      </details>
                    </div>
                    <button
                      className="icon-button"
                      aria-label="View upcoming payments"
                      onClick={() => navigate("payments")}
                    >
                      <ChevronRight size={22} />
                    </button>
                  </section>
                  <section className="home-section">
                    <div className="section-heading">
                      <h2>
                        Needs your attention{" "}
                        <span>{pending + lowStock.length}</span>
                      </h2>
                    </div>
                    <div className="action-list">
                      {project.payments
                        .filter((r) => r.status === "Pending")
                        .slice(0, 2)
                        .map((r) => (
                          <button
                            className="action-row"
                            key={r.id}
                            onClick={() => navigate("payments")}
                          >
                            <span className="action-symbol">
                              <ClipboardCheck size={21} />
                            </span>
                            <span className="grow">
                              <strong>{r.title}</strong>
                              <small>
                                {r.party} · {fmt(Number(r.amount))}
                              </small>
                            </span>
                            <span className="action-state">Review</span>
                            <ChevronRight size={17} />
                          </button>
                        ))}
                      {project.decisions
                        .filter((r) => r.status === "Pending")
                        .slice(0, 2)
                        .map((r) => (
                          <button
                            className="action-row"
                            key={r.id}
                            onClick={() => navigate("decisions")}
                          >
                            <span className="action-symbol">
                              <Check size={21} />
                            </span>
                            <span className="grow">
                              <strong>{r.title}</strong>
                              <small>
                                Decide by {dateLabel(String(r.due))}
                              </small>
                            </span>
                            <ChevronRight size={17} />
                          </button>
                        ))}
                      {lowStock.slice(0, 1).map((r) => (
                        <button
                          className="action-row"
                          key={r.id}
                          onClick={() => navigate("materials")}
                        >
                          <span className="action-symbol">
                            <Package size={21} />
                          </span>
                          <span className="grow">
                            <strong>{r.title}</strong>
                            <small>
                              {Number(r.received) - Number(r.used)} {r.unit}{" "}
                              left · Running low
                            </small>
                          </span>
                          <ChevronRight size={17} />
                        </button>
                      ))}
                      {pending + lowStock.length === 0 && (
                        <p className="quiet-note">
                          <Check size={18} /> Nothing waiting for your review.
                        </p>
                      )}
                    </div>
                  </section>
                  <section className="home-section">
                    <div className="section-heading">
                      <h2>On site</h2>
                      <button
                        className="text-link"
                        onClick={() => navigate("updates")}
                      >
                        Open diary <ArrowRight size={16} />
                      </button>
                    </div>
                    {currentStage && (
                      <button
                        className="current-work"
                        onClick={() => navigate("stages")}
                      >
                        <span className="work-icon">
                          <HardHat size={24} />
                        </span>
                        <span className="grow">
                          <small>In progress</small>
                          <strong>{currentStage.title}</strong>
                          <div className="progress">
                            <span
                              style={{
                                width: Number(currentStage.progress) + "%",
                              }}
                            />
                          </div>
                        </span>
                        <strong>{currentStage.progress}%</strong>
                      </button>
                    )}
                    {project.updates[0] ? (
                      <article className="latest-note">
                        <div className="note-meta">
                          <span className="avatar">
                            {String(project.updates[0].author).slice(0, 1)}
                          </span>
                          <span>
                            <strong>{project.updates[0].author}</strong>
                            <small>
                              {dateLabel(String(project.updates[0].date))} ·{" "}
                              {project.updates[0].workers} people on site
                            </small>
                          </span>
                        </div>
                        <h3>{project.updates[0].title}</h3>
                        <p>{project.updates[0].note}</p>
                        {linkFor(project.updates[0])}
                      </article>
                    ) : (
                      <Empty
                        title="Add a photo or a few lines about today’s work."
                        onAdd={editable ? () => add("updates") : undefined}
                      />
                    )}
                  </section>
                </>
              )}
              {view === "more" && (
                <>
                  <p className="page-description">
                    Everything else for your build.
                  </p>
                  <div className="more-list">
                    {(
                      [
                        "people",
                        "documents",
                        "decisions",
                        "cameras",
                        "settings",
                      ] as View[]
                    ).map((v) => {
                      const Icon = icons[v];
                      const notes: Record<string, string> = {
                        people: "Contractor, architect & your team",
                        documents: "Drawings, bills & agreements",
                        decisions: "Changes that need your approval",
                        cameras: "Open your site cameras",
                        settings: "Budget, home details & access",
                      };
                      return (
                        <button
                          className="more-row"
                          key={v}
                          onClick={() => navigate(v)}
                        >
                          <Icon size={23} />
                          <span className="grow">
                            <strong>
                              {v === "settings"
                                ? "Home settings"
                                : labels[v as Section]}
                            </strong>
                            <small>{notes[v]}</small>
                          </span>
                          <ChevronRight size={19} />
                        </button>
                      );
                    })}
                  </div>
                  <a className="more-row" href="/shop">
                    <Package size={23} />
                    <span className="grow">
                      <strong>ILLAM Shop</strong>
                      <small>Materials, CCTV & water loads · Coming soon</small>
                    </span>
                    <ChevronRight size={19} />
                  </a>
                  <AppInstall />
                  <div className="more-list">
                    <button
                      className="more-row"
                      onClick={() => download("csv")}
                    >
                      <Download size={22} />
                      <span className="grow">
                        <strong>Download expenses</strong>
                        <small>Spreadsheet-friendly CSV</small>
                      </span>
                      <ChevronRight size={19} />
                    </button>
                    <button
                      className="more-row"
                      onClick={() => download("json")}
                    >
                      <FileText size={22} />
                      <span className="grow">
                        <strong>Export project data</strong>
                        <small>Save a copy of your records</small>
                      </span>
                      <ChevronRight size={19} />
                    </button>
                    <button
                      className="more-row"
                      onClick={() =>
                        user
                          ? run(async () => {
                              const result = await authClient.signOut();
                              if (result.error)
                                throw new Error(result.error.message || "Could not sign out. Please try again.");
                              window.location.replace("/");
                            })
                          : setAuthOpen(true)
                      }
                    >
                      {user ? <LogOut size={22} /> : <Users size={22} />}
                      <span className="grow">
                        <strong>
                          {user ? "Sign out" : "Sign in or create account"}
                        </strong>
                        <small>
                          {user?.email || "Start your own home project"}
                        </small>
                      </span>
                      <ChevronRight size={19} />
                    </button>
                  </div>
                  <p className="app-version">
                    ILLAM · Made for the everyday work of building.
                  </p>
                </>
              )}
              {view !== "overview" &&
                view !== "settings" &&
                view !== "more" && (
                  <>
                    {view === "transactions" && (
                      <>
                        <section className="money-summary">
                          <div>
                            <span>Available</span>
                            <strong>{fmt(f.available)}</strong>
                          </div>
                          <div>
                            <span>Spent</span>
                            <strong>{fmt(f.spent)}</strong>
                          </div>
                        </section>
                        <div className="money-actions">
                          {editable && (
                            <>
                              <button
                                className="button primary"
                                onClick={() =>
                                  add("transactions", { kind: "Expense" })
                                }
                              >
                                <Plus size={19} /> Expense
                              </button>
                              <button
                                className="button"
                                onClick={() =>
                                  add("transactions", {
                                    kind: "Contribution",
                                    category: "Funding",
                                    to: "House fund",
                                  })
                                }
                              >
                                <ArrowDownLeft size={19} /> Add funds
                              </button>
                            </>
                          )}
                        </div>
                        <details className="plain-details">
                          <summary>Budget & account balances</summary>
                          <div className="account-balances">
                            {Object.entries(accountBalances(project)).map(
                              ([name, balance]) => (
                                <div key={name}>
                                  <span>{name}</span>
                                  <strong>{fmt(balance)}</strong>
                                </div>
                              ),
                            )}
                          </div>
                          <p>
                            Budget: {fmt(project.budget)} · Forecast:{" "}
                            {fmt(f.forecast)}
                          </p>
                          <small>
                            Transfers move money between accounts. They don’t
                            count as spending.
                          </small>
                        </details>
                      </>
                    )}
                    <div className="section-toolbar">
                      <div className="search-box">
                        <Search size={19} />
                        <input
                          aria-label="Search entries"
                          placeholder="Find an entry…"
                          value={search}
                          onChange={(e) => setSearch(e.target.value)}
                        />
                        {search && (
                          <button
                            className="icon-button"
                            aria-label="Clear search"
                            onClick={() => setSearch("")}
                          >
                            <X size={18} />
                          </button>
                        )}
                      </div>
                    </div>
                    {view === "cameras" && (
                      <p className="page-description">
                        Add a secure viewing link from your camera provider.
                      </p>
                    )}
                    {view === "stages" && (
                      <details className="plain-details">
                        <summary>About progress & cost estimates</summary>
                        <p>
                          Progress is entered by your team. Remaining estimates
                          should exclude amounts already in approved payment
                          requests.
                        </p>
                      </details>
                    )}
                    {view === "transactions" && editable && (
                      <button
                        className="import-launch"
                        onClick={() => setImportOpen(true)}
                      >
                        <FileText size={22} />
                        <span>
                          <strong>Read a bill or statement</strong>
                          <small>PDF, photo or CSV → review → save</small>
                        </span>
                        <ChevronRight size={18} />
                      </button>
                    )}
                    {sectionContent(view)}
                  </>
                )}
              {view === "settings" && (
                <div className="settings-grid">
                  <section className="panel settings-panel">
                    <h2>About your home</h2>
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        const data = new FormData(e.currentTarget);
                        run(async () => {
                          await save({
                            ...project,
                            name: String(data.get("name")).trim(),
                            location: String(data.get("location")),
                            budget: Number(data.get("budget")),
                            reserve: Number(data.get("reserve")),
                            currency: String(data.get("currency")),
                            target: String(data.get("target")),
                          });
                        });
                      }}
                    >
                      <label>
                        Home name
                        <input
                          name="name"
                          defaultValue={project.name}
                          required
                          maxLength={100}
                          disabled={!editable}
                        />
                      </label>
                      <label>
                        Location
                        <input
                          name="location"
                          defaultValue={project.location}
                          disabled={!editable}
                        />
                      </label>
                      <div className="form-two">
                        <label>
                          Total budget
                          <input
                            name="budget"
                            type="number"
                            min="0"
                            step="0.01"
                            defaultValue={project.budget}
                            disabled={!editable}
                          />
                        </label>
                        <label>
                          Minimum reserve
                          <input
                            name="reserve"
                            type="number"
                            min="0"
                            step="0.01"
                            defaultValue={project.reserve}
                            disabled={!editable}
                          />
                        </label>
                      </div>
                      <div className="form-two">
                        <label>
                          Currency
                          <select
                            name="currency"
                            defaultValue={project.currency}
                            disabled={!editable}
                          >
                            {["INR", "AED", "USD", "GBP", "EUR"].map((c) => (
                              <option key={c}>{c}</option>
                            ))}
                          </select>
                        </label>
                        <label>
                          Target completion
                          <input
                            type="date"
                            name="target"
                            defaultValue={project.target}
                            disabled={!editable}
                          />
                        </label>
                      </div>
                      <p className="field-hint">
                        Changing currency relabels values; it does not convert
                        amounts. Dates follow the India construction-site
                        calendar.
                      </p>
                      <button
                        className="button primary"
                        disabled={busy || !editable}
                      >
                        Save settings
                      </button>
                    </form>
                  </section>
                  <div>
                    <section className="panel settings-panel">
                      <h2>Workspace & data</h2>
                      <p>
                        {mode === "demo"
                          ? "You are exploring a sample home. Sign in to save your real project securely."
                          : "Your project is saved in Neon. Refresh to load changes made by collaborators."}
                      </p>
                      {mode === "cloud" && (
                        <>
                          <label>
                            Switch home
                            <select
                              value={active?.id || ""}
                              onChange={(e) =>
                                run(() => loadCloud(e.target.value))
                              }
                            >
                              {projects.map((p) => (
                                <option key={p.id} value={p.id}>
                                  {p.name}
                                </option>
                              ))}
                            </select>
                          </label>
                          <button
                            className="button"
                            onClick={newHome}
                            disabled={busy}
                          >
                            <Plus size={16} /> Another home
                          </button>
                        </>
                      )}
                      <div className="settings-actions">
                        <button
                          className="button"
                          onClick={() => download("json")}
                        >
                          <Download size={16} /> Export project
                        </button>
                        <button
                          className="button"
                          onClick={() => download("csv")}
                        >
                          Export ledger CSV
                        </button>
                      </div>
                      {mode === "demo" && (
                        <button
                          className="button primary"
                          onClick={() => setAuthOpen(true)}
                        >
                          Sign in / create account
                        </button>
                      )}
                    </section>
                    <section className="panel settings-panel">
                      <h2>Project access</h2>
                      <p>
                        People listed in your contacts do not automatically
                        receive access.
                      </p>
                      {mode === "demo" ? (
                        <p>
                          Sign in to invite existing ILLAM users as editors or
                          viewers.
                        </p>
                      ) : (
                        <>
                          {members.map((m) => (
                            <div className="member-row" key={m.id}>
                              <span>
                                {m.email}
                                <small>{m.role}</small>
                              </span>
                              {active?.role === "owner" && (
                                <button
                                  className="icon-button"
                                  aria-label={"Remove access for " + m.email}
                                  onClick={() =>
                                    run(async () => {
                                      await api("members", "DELETE", {
                                        projectId: active.id,
                                        userId: m.id,
                                      });
                                      await loadCloud(active.id);
                                    })
                                  }
                                >
                                  <X size={16} />
                                </button>
                              )}
                            </div>
                          ))}
                          {active?.role === "owner" && (
                            <form
                              onSubmit={(e) => {
                                e.preventDefault();
                                const data = new FormData(e.currentTarget);
                                run(async () => {
                                  await api("members", "POST", {
                                    projectId: active.id,
                                    email: String(data.get("email")),
                                    role: String(data.get("role")),
                                  });
                                  await loadCloud(active.id);
                                  setNotice("Project access updated.");
                                });
                              }}
                            >
                              <label>
                                Email
                                <input
                                  name="email"
                                  type="email"
                                  required
                                  placeholder="They must sign up first"
                                />
                              </label>
                              <label>
                                Access
                                <select name="role">
                                  <option value="viewer">
                                    Viewer — read only
                                  </option>
                                  <option value="editor">
                                    Editor — edit and approve
                                  </option>
                                </select>
                              </label>
                              <button disabled={busy} className="button">
                                Grant access
                              </button>
                            </form>
                          )}
                        </>
                      )}
                    </section>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </main>
      <nav className="bottom-nav" aria-label="Main navigation">
        <button
          className={group === "home" ? "active" : ""}
          aria-current={group === "home" ? "page" : undefined}
          onClick={() => navigate("overview")}
        >
          <House size={23} />
          <span>Home</span>
        </button>
        <button
          className={group === "money" ? "active" : ""}
          aria-current={group === "money" ? "page" : undefined}
          onClick={() => navigate("transactions")}
        >
          <Wallet size={23} />
          <span>Money</span>
        </button>
        <button
          className="central-add"
          aria-label="Add an entry"
          disabled={!editable}
          onClick={() => setQuickAdd(true)}
        >
          <Plus size={28} />
        </button>
        <button
          className={group === "site" ? "active" : ""}
          aria-current={group === "site" ? "page" : undefined}
          onClick={() => navigate("updates")}
        >
          <HardHat size={23} />
          <span>Site</span>
        </button>
        <button
          className={group === "more" ? "active" : ""}
          aria-current={group === "more" ? "page" : undefined}
          onClick={() => navigate("more")}
        >
          <MoreHorizontal size={25} />
          <span>More</span>
        </button>
      </nav>
      {quickAdd && (
        <Modal
          title="What would you like to add?"
          close={() => setQuickAdd(false)}
        >
          <div className="add-menu">
            {[
              {
                section: "transactions",
                kind: "Expense",
                label: "An expense",
                note: "Record money you paid",
                Icon: ArrowUpRight,
              },
              {
                section: "transactions",
                kind: "Contribution",
                label: "Money added",
                note: "Add funds to your home",
                Icon: ArrowDownLeft,
              },
              {
                section: "transactions",
                kind: "Transfer",
                label: "A transfer",
                note: "Move money to a supervisor or account",
                Icon: ArrowLeftRight,
              },
              {
                section: "payments",
                label: "A payment request",
                note: "An upcoming bill or milestone",
                Icon: ClipboardCheck,
              },
              {
                section: "updates",
                label: "A site update",
                note: "Work done, photos or a problem",
                Icon: Camera,
              },
              {
                section: "materials",
                label: "A material",
                note: "Track received and used stock",
                Icon: Package,
              },
            ].map((item) => (
              <button
                key={item.label}
                className="more-row"
                onClick={() =>
                  add(
                    item.section as Section,
                    item.kind
                      ? {
                          kind: item.kind,
                          category:
                            item.kind === "Contribution"
                              ? "Funding"
                              : item.kind === "Transfer"
                                ? "Transfer"
                                : "Materials",
                          to: item.kind === "Contribution" ? "House fund" : "",
                        }
                      : undefined,
                  )
                }
              >
                <item.Icon size={24} />
                <span className="grow">
                  <strong>{item.label}</strong>
                  <small>{item.note}</small>
                </span>
                <ChevronRight size={18} />
              </button>
            ))}
          </div>
        </Modal>
      )}
      {notice && (
        <div className="toast" role="status">
          <Check size={17} />
          {notice}
        </div>
      )}
      {importOpen && (
        <Modal
          title="Read a bill or statement"
          close={() => setImportOpen(false)}
        >
          <ImportExpenses
            existing={project.transactions}
            onSave={async (rows) => {
              await save({
                ...project,
                transactions: [...project.transactions, ...rows],
              });
              setImportOpen(false);
            }}
          />
        </Modal>
      )}
      {modal && (
        <Modal
          title={
            modal.row
              ? "Edit entry"
              : modal.section === "transactions"
                ? "Record money"
                : actionTitle[modal.section]
          }
          close={() => setModal(null)}
        >
          <form onSubmit={rowSubmit}>
            <div className="form-grid">
              {modal.section === "transactions" ? (
                <QuickMoneyForm
                  row={modal.row}
                  defaults={modal.defaults}
                  currency={project.currency}
                  accounts={Object.keys(accountBalances(project))}
                />
              ) : modal.section === "updates" ? (
                <QuickSiteForm
                  row={modal.row}
                  author={user?.email.split("@")[0] || "Homeowner"}
                />
              ) : (
                <>
                  {fields[modal.section].map((field) => (
                    <FormField
                      key={field.key}
                      field={field}
                      value={
                        modal.row?.[field.key] ??
                        modal.defaults?.[field.key] ??
                        (field.type === "date"
                          ? day()
                          : field.key === "account" || field.key === "from"
                            ? "House fund"
                            : field.key === "version"
                              ? "1"
                              : field.type === "number"
                                ? 0
                                : undefined)
                      }
                    />
                  ))}
                </>
              )}
              {(modal.section === "documents" ||
                modal.section === "updates") && (
                <label className="full-width">
                  {modal.section === "updates"
                    ? "Add a photo (optional)"
                    : "Attach a file (PDF or image)"}
                  <input
                    type="file"
                    name="file"
                    accept={
                      modal.section === "updates"
                        ? "image/jpeg,image/png,image/webp"
                        : "application/pdf,image/jpeg,image/png,image/webp"
                    }
                    disabled={mode === "demo"}
                  />
                  <small>
                    Up to 3 MB.{" "}
                    {mode === "demo"
                      ? "Sign in to upload; demo supports links."
                      : "Accessible only to project members."}
                  </small>
                </label>
              )}
            </div>
            <div className="modal-footer">
              <button
                type="button"
                className="button"
                onClick={() => setModal(null)}
              >
                Cancel
              </button>
              <button className="button primary" disabled={busy}>
                {busy ? "Saving…" : "Save entry"}
              </button>
            </div>
            {error && (
              <p className="form-error" role="alert">
                {error}
              </p>
            )}
          </form>
        </Modal>
      )}
      {authOpen && !verifyEmail && resetStep === "none" && (
        <Modal
          title={signup ? "Create your account" : "Sign in"}
          close={() => setAuthOpen(false)}
        >
          <p className="modal-intro">
            Use your email to save and share your home project.
          </p>
          <form onSubmit={authenticate}>
            {signup && (
              <label>
                Your name
                <input name="name" required autoComplete="name" />
              </label>
            )}
            <label>
              Email
              <input name="email" type="email" required autoComplete="email" />
            </label>
            <label>
              Password
              <input
                name="password"
                type="password"
                required
                minLength={8}
                autoComplete={signup ? "new-password" : "current-password"}
              />
            </label>
            <button
              className="button primary full"
              disabled={busy || !configured}
            >
              {busy ? "Please wait…" : signup ? "Create account" : "Sign in"}
            </button>
            {!configured && (
              <p className="form-error">
                Cloud configuration is not available on this deployment.
              </p>
            )}
            {error && (
              <p className="form-error" role="alert">
                {error}
              </p>
            )}
            <button
              type="button"
              className="text-link auth-toggle"
              onClick={() => setSignup(!signup)}
            >
              {signup
                ? "Already have an account? Sign in"
                : "New here? Create an account"}
            </button>
            {!signup && (
              <button
                type="button"
                className="text-link auth-toggle"
                onClick={() => setResetStep("email")}
              >
                Forgot your password?
              </button>
            )}
          </form>
        </Modal>
      )}
      {authOpen && verifyEmail && (
        <Modal
          title="Verify your email"
          close={() => {
            setAuthOpen(false);
            setVerifyEmail("");
          }}
        >
          <p>Enter the code sent to {verifyEmail}.</p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const data = new FormData(e.currentTarget);
              run(async () => {
                const r = await authClient.emailOtp.verifyEmail({
                  email: verifyEmail,
                  otp: String(data.get("otp")),
                });
                if (r.error)
                  throw new Error(r.error.message || "Verification failed");
                setVerifyEmail("");
                setSignup(false);
                const session = await api("session");
                if (session.user) {
                  setUser(session.user);
                  await loadCloud();
                  setAuthOpen(false);
                } else setNotice("Email verified. You can sign in now.");
              });
            }}
          >
            <label>
              Verification code
              <input
                name="otp"
                required
                inputMode="numeric"
                autoComplete="one-time-code"
              />
            </label>
            <button className="button primary full" disabled={busy}>
              Verify email
            </button>
          </form>
          <button
            className="text-link auth-toggle"
            disabled={busy}
            onClick={() =>
              run(async () => {
                const r = await authClient.sendVerificationEmail({
                  email: verifyEmail,
                  callbackURL: window.location.origin + "/",
                });
                if (r.error)
                  throw new Error(r.error.message || "Could not resend code");
                setNotice("A new verification code has been sent.");
              })
            }
          >
            Resend code
          </button>
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
        </Modal>
      )}
      {authOpen && resetStep !== "none" && (
        <Modal
          title="Reset your password"
          close={() => {
            setAuthOpen(false);
            setResetStep("none");
          }}
        >
          <p>
            {resetStep === "email"
              ? "We will email you a code to reset your password."
              : "Enter the code sent to " + resetEmail + "."}
          </p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const data = new FormData(e.currentTarget);
              run(async () => {
                if (resetStep === "email") {
                  const email = String(data.get("email"));
                  const r = await authClient.forgetPassword.emailOtp({ email });
                  if (r.error)
                    throw new Error(
                      r.error.message || "Unable to send reset code",
                    );
                  setResetEmail(email);
                  setResetStep("code");
                } else {
                  const r = await authClient.emailOtp.resetPassword({
                    email: resetEmail,
                    otp: String(data.get("otp")),
                    password: String(data.get("password")),
                  });
                  if (r.error)
                    throw new Error(
                      r.error.message || "Unable to reset password",
                    );
                  setResetStep("none");
                  setSignup(false);
                  setNotice("Password reset. Sign in with your new password.");
                }
              });
            }}
          >
            {resetStep === "email" ? (
              <label>
                Email
                <input
                  name="email"
                  type="email"
                  required
                  autoComplete="email"
                />
              </label>
            ) : (
              <>
                <label>
                  Reset code
                  <input
                    name="otp"
                    required
                    inputMode="numeric"
                    autoComplete="one-time-code"
                  />
                </label>
                <label>
                  New password
                  <input
                    name="password"
                    type="password"
                    minLength={8}
                    required
                    autoComplete="new-password"
                  />
                </label>
              </>
            )}
            <button className="button primary full" disabled={busy}>
              {resetStep === "email" ? "Send reset code" : "Reset password"}
            </button>
            {error && (
              <p className="form-error" role="alert">
                {error}
              </p>
            )}
          </form>
          <button
            className="text-link auth-toggle"
            onClick={() => setResetStep("none")}
          >
            Back to sign in
          </button>
        </Modal>
      )}
      {deleteRow && (
        <Modal title="Delete this entry?" close={() => setDeleteRow(null)}>
          <p>
            This removes “{deleteRow.row.title || deleteRow.row.party}” from
            this project and updates related totals. This cannot be undone.
          </p>
          <div className="modal-footer">
            <button className="button" onClick={() => setDeleteRow(null)}>
              Keep entry
            </button>
            <button
              disabled={busy}
              className="button destructive"
              onClick={() =>
                run(async () => {
                  await save({
                    ...project,
                    [deleteRow.section]: project[deleteRow.section].filter(
                      (r) => r.id !== deleteRow.row.id,
                    ),
                  });
                  setDeleteRow(null);
                })
              }
            >
              Delete entry
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
function FormField({
  field,
  value,
}: {
  field: Field;
  value?: string | number;
}) {
  return (
    <label className={field.type === "textarea" ? "full-width" : ""}>
      {field.label}
      {field.type === "select" ? (
        <select name={field.key} defaultValue={value} required={field.required}>
          {field.options?.map((v) => (
            <option key={v}>{v}</option>
          ))}
        </select>
      ) : field.type === "textarea" ? (
        <textarea
          name={field.key}
          defaultValue={value}
          required={field.required}
          rows={3}
          maxLength={3000}
        />
      ) : (
        <input
          name={field.key}
          type={field.type || "text"}
          inputMode={field.type === "number" ? "decimal" : undefined}
          defaultValue={value}
          required={field.required}
          min={
            field.key === "amount" ? 0 : field.type === "number" ? 0 : undefined
          }
          max={field.key === "progress" ? 100 : undefined}
          step={field.type === "number" ? "0.01" : undefined}
          maxLength={500}
        />
      )}{" "}
      {field.hint && <small>{field.hint}</small>}
    </label>
  );
}
function Modal({
  title,
  close,
  children,
}: {
  title: string;
  close: () => void;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const old = document.activeElement as HTMLElement;
    ref.current?.querySelector<HTMLElement>("button")?.focus();
    const before = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = before;
      old?.focus();
    };
  }, []);
  return (
    <div
      className="modal-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) close();
      }}
    >
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        ref={ref}
        onKeyDown={(e) => {
          if (e.key !== "Tab") return;
          const nodes = Array.from(
            ref.current?.querySelectorAll<HTMLElement>(
              "button:not(:disabled),input:not(:disabled),select:not(:disabled),textarea:not(:disabled),a[href],summary",
            ) || [],
          );
          if (e.shiftKey && document.activeElement === nodes[0]) {
            e.preventDefault();
            nodes.at(-1)?.focus();
          } else if (!e.shiftKey && document.activeElement === nodes.at(-1)) {
            e.preventDefault();
            nodes[0]?.focus();
          }
        }}
      >
        <div className="modal-heading">
          <h2>{title}</h2>
          <button
            className="icon-button"
            aria-label="Close dialog"
            onClick={close}
          >
            <X size={21} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
