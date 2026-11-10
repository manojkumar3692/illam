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
type View = "overview" | Section | "settings";
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
};
const nav: View[] = [
  "overview",
  "transactions",
  "payments",
  "stages",
  "materials",
  "updates",
  "decisions",
  "people",
  "documents",
  "cameras",
];
const descriptions: Record<Section, string> = {
  transactions: "Every rupee, with a little more clarity.",
  payments: "Review the work. Approve the request. Record the payment.",
  stages: "From the first drawing to the day you move in.",
  materials: "Know what arrived, what was used, and what is running low.",
  people: "The people bringing your home to life.",
  updates: "A small daily update. A clearer picture of your build.",
  decisions: "Keep the work moving with timely decisions.",
  documents: "The right drawing, bill, or contract, always within reach.",
  cameras: "Your secure camera portals, together in one place.",
};
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
      <Leaf size={30} />
      <h3>A fresh start</h3>
      <p>{title}</p>
      {onAdd && (
        <button className="button primary" onClick={onAdd}>
          <Plus size={16} /> Add your first entry
        </button>
      )}
    </div>
  );
}
function HouseDrawing() {
  return (
    <svg
      className="house-drawing"
      viewBox="0 0 470 250"
      fill="none"
      aria-label="Architectural illustration of a courtyard house"
      role="img"
    >
      <path d="M28 203 235 250 452 178 246 136Z" fill="#244e41" />
      <path d="m77 163 111 27 173-57-111-28Z" fill="#a9b59c" />
      <path d="m77 112 111 28v50L77 163Z" fill="#d9d7b5" />
      <path d="m188 140 173-57v50l-173 57Z" fill="#eee7c9" />
      <path d="m65 111 123 31 188-62-125-30Z" fill="#faf0d0" />
      <path d="m65 111 123 31v8L65 119Z" fill="#bbb99a" />
      <path d="m188 142 188-62v8l-188 62Z" fill="#d1cbac" />
      <path d="m222 77 62 15 62-21-62-15Z" fill="#587667" />
      <path d="m222 77 62 15v8l-62-15Z" fill="#b9b89a" />
      <path d="m284 92 62-21v8l-62 21Z" fill="#d0c8a8" />
      <path
        d="m209 148 40-13v31l-40 13ZM261 131l37-12v31l-37 12ZM309 115l31-10v31l-31 10Z"
        fill="#365e52"
      />
      <path d="m96 130 26 7v27l-26-7ZM139 141l26 7v27l-26-7Z" fill="#567b69" />
      <path
        d="m228 141 0 31m52-46v30m44-20v-26"
        stroke="#d8d6b9"
        strokeWidth="2"
      />
      <path d="m205 190 78 18 72-24-77-19Z" fill="#698775" />
      <path d="m175 199 78 18 30-9-78-18Z" fill="#849782" />
      <path d="m145 208 78 18 30-9-78-18Z" fill="#9aa38b" />
      <path
        d="M389 154v-55M53 181v-45M406 195v-32"
        stroke="#b9b997"
        strokeWidth="4"
      />
      <ellipse cx="389" cy="92" rx="20" ry="32" fill="#72906a" />
      <ellipse cx="53" cy="129" rx="16" ry="25" fill="#859c73" />
      <ellipse cx="406" cy="157" rx="14" ry="23" fill="#637f60" />
      <path
        d="m15 218 107 25M320 228l132-42M108 63l65-22"
        stroke="#759784"
        strokeDasharray="4 7"
        opacity=".6"
      />
    </svg>
  );
}
export default function Illam() {
  const [project, setProject] = useState<Project>(emptyProject());
  const [ready, setReady] = useState(false);
  const [mode, setMode] = useState<"demo" | "cloud">("demo");
  const [view, setView] = useState<View>("overview");
  const [search, setSearch] = useState("");
  const [mobile, setMobile] = useState(false);
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
    setReady(true);
    api("session")
      .then(async (r) => {
        setConfigured(r.configured);
        if (r.user) {
          setUser(r.user);
          await loadCloud();
        }
      })
      .catch((e) => setError(e.message));
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
      }
    };
    window.addEventListener("keydown", fn);
    return () => window.removeEventListener("keydown", fn);
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
    setMobile(false);
  }
  function add(section: Section, defaults?: Partial<Row>) {
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
      ? "Home overview"
      : view === "settings"
        ? "Project settings"
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
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Entry / description</th>
                <th>Category</th>
                <th>Date</th>
                <th>Account</th>
                <th className="align-right">Amount</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td>
                    <div className="entry-title">
                      <span
                        className={
                          "entry-icon " +
                          (r.kind === "Contribution" ? "green" : "")
                        }
                      >
                        {r.kind === "Contribution" ? (
                          <ArrowDownLeft size={17} />
                        ) : r.kind === "Transfer" ? (
                          <ArrowLeftRight size={17} />
                        ) : (
                          <ArrowUpRight size={17} />
                        )}
                      </span>
                      <div>
                        <strong>{r.party}</strong>
                        <small>{r.note || r.kind}</small>
                      </div>
                    </div>
                  </td>
                  <td>
                    <Badge>{r.category}</Badge>
                  </td>
                  <td>{r.date}</td>
                  <td>
                    {r.kind === "Contribution"
                      ? r.to
                      : r.kind === "Transfer"
                        ? `${r.from} → ${r.to}`
                        : r.from}
                  </td>
                  <td
                    className={
                      "align-right amount " +
                      (r.kind === "Contribution" ? "positive" : "")
                    }
                  >
                    {r.kind === "Contribution"
                      ? "+"
                      : r.kind === "Expense"
                        ? "−"
                        : ""}
                    {fmt(Number(r.amount))}
                    <small>{r.kind}</small>
                  </td>
                  <td>{recordActions(section, r)}</td>
                </tr>
              ))}
            </tbody>
          </table>
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
  return (
    <div className="app-shell">
      <aside className={"sidebar " + (mobile ? "open" : "")}>
        <a
          className="brand"
          href="#"
          onClick={(e) => {
            e.preventDefault();
            navigate("overview");
          }}
        >
          <span className="brand-icon">
            <House size={23} />
          </span>
          ILLAM<span className="brand-dot">.</span>
        </a>
        <p className="brand-caption">A LITTLE CLOSER TO HOME</p>
        <div className="project-switch">
          <span className="project-mark">
            <House size={18} />
          </span>
          <div>
            <strong>{project.name}</strong>
            <small>
              {mode === "demo"
                ? "Sample home"
                : project.location || "Your home project"}
            </small>
          </div>
          <ChevronDown size={15} />
        </div>
        <div className="nav-label">YOUR HOME</div>
        <nav>
          {nav.map((item) => {
            const Icon = icons[item];
            return (
              <button
                className={"nav-item " + (view === item ? "active" : "")}
                key={item}
                onClick={() => navigate(item)}
              >
                <Icon size={18} />
                <span>
                  {item === "overview" ? "Overview" : labels[item as Section]}
                </span>
                {item === "decisions" && pending > 0 && (
                  <span className="nav-count">{pending}</span>
                )}
              </button>
            );
          })}
        </nav>
        <div className="sidebar-bottom">
          <div className="little-note">
            <Leaf size={19} />
            <strong>Good homes take care.</strong>
            <p>
              One decision. One day.
              <br />
              One step closer.
            </p>
          </div>
          <button
            className={"nav-item " + (view === "settings" ? "active" : "")}
            onClick={() => navigate("settings")}
          >
            <Settings size={18} /> Project settings
          </button>
          <button
            className="profile"
            onClick={() =>
              user
                ? run(async () => {
                    await authClient.signOut();
                    setUser(null);
                    setActive(null);
                    setMode("demo");
                    setProject(
                      JSON.parse(localStorage.getItem(STORAGE) || "null") ||
                        demoProject(),
                    );
                  })
                : setAuthOpen(true)
            }
          >
            <span className="avatar small-avatar">
              {user ? user.email[0].toUpperCase() : "M"}
            </span>
            <span>
              <strong>
                {user ? user.email.split("@")[0] : "Your home, your space"}
              </strong>
              <small>{user ? "Sign out" : "Sign in to get started"}</small>
            </span>
            {user ? <LogOut size={15} /> : <ArrowRight size={15} />}
          </button>
        </div>
      </aside>
      {mobile && (
        <button
          className="sidebar-overlay"
          aria-label="Close navigation"
          onClick={() => setMobile(false)}
        />
      )}
      <main>
        <header className="topbar">
          <div className="breadcrumb">
            <button
              className="icon-button mobile-menu"
              aria-label="Open navigation"
              onClick={() => setMobile(true)}
            >
              <Menu size={20} />
            </button>
            <House size={15} />
            <span>Your home</span>
            <span>/</span>
            <strong>{title}</strong>
          </div>
          <div className="topbar-right">
            <span className="connection-dot" />
            <span>
              {mode === "demo" ? "Demo workspace" : "Private workspace"}
            </span>
            <button
              className="icon-button"
              title="Refresh project"
              onClick={() =>
                mode === "cloud"
                  ? run(() => loadCloud(active?.id))
                  : setNotice("Demo entries are saved in this browser.")
              }
            >
              <RefreshCw size={16} />
            </button>
          </div>
        </header>
        <div className="content">
          {mode === "demo" && (
            <div className="demo-banner">
              <span>
                <strong>Explore ILLAM.</strong> Sample data, saved only in this
                browser.
              </span>
              <button
                onClick={() =>
                  user ? run(() => loadCloud()) : setAuthOpen(true)
                }
              >
                Open my real home <ArrowRight size={14} />
              </button>
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
                <X size={17} />
              </button>
            </div>
          )}
          <div className="page-heading">
            <div>
              <div className="eyebrow">
                {view === "overview"
                  ? "EVERY DETAIL, A LITTLE CLEARER"
                  : "YOUR HOME · " + title.toUpperCase()}
              </div>
              <h1>
                {view === "overview" ? "A little closer to home." : title}
              </h1>
              <p>
                {view === "overview"
                  ? "Your build, your budget, and what needs you next."
                  : view === "settings"
                    ? "Make this space your own."
                    : descriptions[view]}
              </p>
            </div>
            <div className="heading-actions">
              {view === "overview" ? (
                <>
                  <button className="button" onClick={() => download("json")}>
                    <Download size={16} /> Export
                  </button>
                  {editable && (
                    <button
                      className="button primary"
                      onClick={() => add("transactions")}
                    >
                      <Plus size={17} /> Add entry
                    </button>
                  )}
                </>
              ) : (
                view !== "settings" && (
                  <>
                    {view === "transactions" && (
                      <button
                        className="button"
                        onClick={() => download("csv")}
                      >
                        <Download size={16} /> CSV
                      </button>
                    )}
                    {editable && (
                      <button
                        className="button primary"
                        onClick={() => add(view as Section)}
                      >
                        <Plus size={17} /> Add{" "}
                        {view === "transactions"
                          ? "entry"
                          : view === "stages"
                            ? "stage"
                            : view === "people"
                              ? "person"
                              : view === "updates"
                                ? "update"
                                : view === "cameras"
                                  ? "camera"
                                  : "new"}
                      </button>
                    )}
                  </>
                )
              )}
            </div>
          </div>
          {mode === "cloud" && !active ? (
            <div className="welcome panel">
              <House size={46} />
              <h2>Every home starts somewhere.</h2>
              <p>
                Create your own project. Your real home starts with a clean
                slate.
              </p>
              <button
                disabled={busy}
                className="button primary"
                onClick={newHome}
              >
                <Plus size={16} /> Create my home
              </button>
            </div>
          ) : (
            <>
              {view === "overview" && (
                <>
                  <div className="overview-grid">
                    <section className="home-hero">
                      <div className="hero-copy">
                        <span className="hero-pill">
                          <span />{" "}
                          {currentStage
                            ? "Construction in progress"
                            : "Your home journey"}
                        </span>
                        <h2>{project.name}</h2>
                        <p>
                          {project.location ||
                            "Add your location in project settings"}
                        </p>
                        <div className="hero-bottom">
                          <span className="hero-progress">
                            {f.progress}
                            <small>%</small>
                          </span>
                          <div>
                            <strong>of stages complete</strong>
                            <small>Equal-weight stage average</small>
                          </div>
                        </div>
                        <div className="hero-track">
                          <span style={{ width: f.progress + "%" }} />
                        </div>
                        <button onClick={() => navigate("stages")}>
                          View your build plan <ArrowRight size={16} />
                        </button>
                      </div>
                      <HouseDrawing />
                    </section>
                    <section className="funding-card">
                      <div className="spread">
                        <span className="eyebrow">LOOKING AHEAD · 14 DAYS</span>
                        <Wallet size={19} />
                      </div>
                      <h3>
                        {f.topup
                          ? "A little planning goes a long way."
                          : "Your next steps are covered."}
                      </h3>
                      <p>
                        {f.topup
                          ? "Additional funds needed, including your reserve."
                          : "Available funds cover recorded upcoming payments and reserve."}
                      </p>
                      <div className="funding-amount">{fmt(f.topup)}</div>
                      <div className="funding-details">
                        <span>
                          Scheduled payments <strong>{fmt(f.due)}</strong>
                        </span>
                        <span>
                          Reserve to maintain{" "}
                          <strong>{fmt(project.reserve)}</strong>
                        </span>
                        <span>
                          Available funds <strong>{fmt(f.available)}</strong>
                        </span>
                      </div>
                      <button
                        className="button"
                        onClick={() =>
                          editable
                            ? add("transactions", {
                                kind: "Contribution",
                                category: "Funding",
                                to: "House fund",
                              })
                            : navigate("payments")
                        }
                      >
                        {editable ? "Record added funds" : "View payments"}{" "}
                        <ArrowRight size={15} />
                      </button>
                      <small>
                        Includes pending requests; confirm before funding.
                      </small>
                    </section>
                  </div>
                  <div className="stat-grid">
                    <div className="stat-card">
                      <span>
                        Total budget <Wallet size={16} />
                      </span>
                      <strong>{fmt(project.budget)}</strong>
                      <small>Your planned investment</small>
                    </div>
                    <div className="stat-card">
                      <span>
                        Spent so far <ArrowUpRight size={17} />
                      </span>
                      <strong>{fmt(f.spent)}</strong>
                      <small>
                        {project.budget
                          ? Math.round((f.spent / project.budget) * 100)
                          : 0}
                        % of total budget
                      </small>
                    </div>
                    <div className="stat-card">
                      <span>
                        Available funds <ArrowDownLeft size={17} />
                      </span>
                      <strong className={f.available < 0 ? "negative" : ""}>
                        {fmt(f.available)}
                      </strong>
                      <small>Contributions less expenses</small>
                    </div>
                    <div className="stat-card">
                      <span>
                        Forecast final cost <Layers size={17} />
                      </span>
                      <strong>{fmt(f.forecast)}</strong>
                      <small>
                        {f.forecast > project.budget
                          ? "Above your planned budget"
                          : "Based on recorded estimates"}
                      </small>
                    </div>
                  </div>
                  <div className="lower-grid">
                    <section className="panel">
                      <div className="panel-heading">
                        <div>
                          <h2>Coming up next</h2>
                          <p>Payments on the horizon</p>
                        </div>
                        <button
                          className="text-link"
                          onClick={() => navigate("payments")}
                        >
                          View all <ArrowRight size={15} />
                        </button>
                      </div>
                      {f.upcoming.length ? (
                        f.upcoming.slice(0, 3).map(paymentCard)
                      ) : (
                        <Empty title="No upcoming payment requests." />
                      )}
                      <div className="panel-foot">
                        <ShieldCheck size={15} /> Verify work before approving a
                        payment.
                      </div>
                    </section>
                    <section className="panel">
                      <div className="panel-heading">
                        <div>
                          <h2>Around the site</h2>
                          <p>The latest from your build</p>
                        </div>
                        <button
                          className="text-link"
                          onClick={() => navigate("updates")}
                        >
                          Site diary <ArrowRight size={15} />
                        </button>
                      </div>
                      {project.updates.slice(0, 2).map((r) => (
                        <div className="diary-row" key={r.id}>
                          <span className="diary-dot" />
                          <div>
                            <small>
                              {r.date} · {r.author}
                            </small>
                            <h3>{r.title}</h3>
                            <p>{r.note}</p>
                          </div>
                        </div>
                      ))}
                      {!project.updates.length && (
                        <Empty title="Your site updates will appear here." />
                      )}
                    </section>
                  </div>
                  <section className="attention-strip">
                    <div>
                      <span className="attention-icon">
                        <ClipboardCheck size={22} />
                      </span>
                      <div>
                        <h3>
                          {pending
                            ? `${pending} things need your attention`
                            : "A moment of calm."}
                        </h3>
                        <p>
                          {pending
                            ? "Payment requests and decisions are waiting for a review."
                            : "You have no pending approvals right now."}
                        </p>
                      </div>
                    </div>
                    <button
                      className="text-link"
                      onClick={() =>
                        navigate(
                          project.payments.some((r) => r.status === "Pending")
                            ? "payments"
                            : "decisions",
                        )
                      }
                    >
                      Take a look <ArrowRight size={16} />
                    </button>
                  </section>
                </>
              )}
              {view !== "overview" && view !== "settings" && (
                <>
                  <div className="section-toolbar">
                    <div className="search-box">
                      <Search size={17} />
                      <input
                        aria-label="Search entries"
                        placeholder={
                          "Search " + labels[view].toLowerCase() + "…"
                        }
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                      />
                    </div>
                    <span className="muted">
                      {project[view].length} entries
                    </span>
                  </div>
                  {view === "transactions" && (
                    <div className="info-note">
                      <ArrowLeftRight size={17} />
                      <span>
                        Transfers move custody of funds. They are not expenses.
                        Record a supplier payment separately when that money is
                        spent.
                      </span>
                    </div>
                  )}
                  {view === "cameras" && (
                    <div className="info-note">
                      <ShieldCheck size={18} />
                      <span>
                        Add your camera provider’s secure viewing portal.
                        Streams open with that provider’s sign-in; ILLAM does
                        not record or analyse people.
                      </span>
                    </div>
                  )}
                  {view === "stages" && (
                    <div className="info-note">
                      Remaining estimates should exclude approved payment
                      requests. Forecast = spent + approved unpaid requests +
                      uncommitted estimates.
                    </div>
                  )}
                  {view === "transactions" && (
                    <div className="account-balances">
                      {Object.entries(accountBalances(project)).map(
                        ([name, balance]) => (
                          <div key={name}>
                            <span>{name}</span>
                            <strong className={balance < 0 ? "negative" : ""}>
                              {fmt(balance)}
                            </strong>
                          </div>
                        ),
                      )}
                    </div>
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
          <footer className="footer">
            <span>
              ILLAM <span>·</span> Built around your home.
            </span>
            <span>
              {mode === "demo"
                ? "Sample project · Browser storage"
                : "Private project · Neon"}{" "}
              <Leaf size={13} />
            </span>
          </footer>
        </div>
      </main>
      {notice && (
        <div className="toast" role="status">
          <Check size={17} />
          {notice}
        </div>
      )}
      {modal && (
        <Modal
          title={
            (modal.row ? "Edit " : "Add ") + labels[modal.section].toLowerCase()
          }
          close={() => setModal(null)}
        >
          <form onSubmit={rowSubmit}>
            <div className="form-grid">
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
              {(modal.section === "documents" ||
                modal.section === "updates") && (
                <label className="full-width">
                  Private attachment (PDF, JPG, PNG, WebP)
                  <input
                    type="file"
                    name="file"
                    accept="application/pdf,image/jpeg,image/png,image/webp"
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
          title={signup ? "Start your home journey" : "Welcome home"}
          close={() => setAuthOpen(false)}
        >
          <p className="modal-intro">
            A private space for your build. Your demo stays separate.
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
    ref.current?.querySelector<HTMLElement>("input,button,select")?.focus();
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
              "button:not(:disabled),input:not(:disabled),select:not(:disabled),textarea:not(:disabled),a[href]",
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
