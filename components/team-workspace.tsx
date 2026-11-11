"use client";
import { useState, useRef, type FormEvent } from "react";
import {
  House,
  ClipboardList,
  NotebookPen,
  Users,
  LogOut,
  RefreshCw,
} from "lucide-react";
import { day, money, type Project } from "@/lib/model";
import { canSubmit } from "@/lib/access";
import StageSelect from "./stage-select";
import BuildView from "./build-view";
import { quickItems } from "@/lib/quick-items";
export default function TeamWorkspace({
  project,
  active,
  userId,
  projects,
  onRefresh,
  onSwitch,
  onLogout,
}: {
  project: Project;
  active: { id: string; role: string; revision: number };
  userId: string;
  projects: { id: string; name: string }[];
  onRefresh: () => Promise<void>;
  onSwitch: (id: string) => Promise<void>;
  onLogout: () => Promise<void>;
}) {
  const [tab, setTab] = useState("home"),
    [form, setForm] = useState(""),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const [preset, setPreset] = useState("");
  const canWork = canSubmit(active.role);
  async function run(fn: () => Promise<void>) {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError("");
    try {
      await fn();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Please try again.");
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const values = new FormData(e.currentTarget);
    await run(async () => {
      let fileId = "",
        fileName = "";
      const file = values.get("file");
      if (file instanceof File && file.size) {
        const upload = new FormData();
        upload.set("projectId", active.id);
        upload.set("file", file);
        const response = await fetch("/api/files", {
          method: "POST",
          body: upload,
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error);
        fileId = result.id;
        fileName = file.name;
      }
      const base = {
        id: crypto.randomUUID(),
        stageId: String(values.get("stageId") || ""),
      };
      let entry: Record<string, unknown>;
      if (form === "Payment" || form === "Reimbursement")
        entry = {
          ...base,
          action: "request",
          requestType: form,
          title: String(values.get("title")),
          amount: Number(values.get("amount")),
          category: String(values.get("category")),
          due: String(values.get("due")),
          spentDate: String(values.get("spentDate") || ""),
          note: String(values.get("note") || ""),
          fileId,
          fileName,
        };
      else if (form === "daily")
        entry = {
          ...base,
          action: "daily",
          title: String(values.get("title")),
          note: String(values.get("note")),
        };
      else
        entry = {
          ...base,
          action: "checkin",
          status: String(values.get("status")),
          note: String(values.get("note") || ""),
        };
      await send(entry);
      setForm("");
      setPreset("");
      setNotice(
        entry.action === "request"
          ? "Sent to the owner for review."
          : "Saved. The owner can see your entry.",
      );
    });
  }
  async function send(entry: Record<string, unknown>) {
    const response = await fetch("/api/team", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        projectId: active.id,
        revision: active.revision,
        entry,
      }),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error);
    await onRefresh();
  }
  const today = (project.attendance || []).find(
    (r) => r.userId === userId && r.date === day(),
  );
  return (
    <div className="app-shell team-shell">
      <header className="app-header">
        <a href="/" className="wordmark">
          illam<span>•</span>
        </a>
        <select
          aria-label="Switch home"
          value={active.id}
          disabled={busy}
          onChange={(e) =>
            run(async () => {
              await onSwitch(e.target.value);
              setForm("");
              setTab("home");
            })
          }
        >
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
        <button
          className="icon-button"
          aria-label="Refresh project"
          onClick={() => run(onRefresh)}
        >
          <RefreshCw size={19} />
        </button>
      </header>
      <main className="content">
        <p className="eyebrow">{active.role} access</p>
        {error && (
          <p className="error-banner" role="alert">
            {error}
          </p>
        )}
        {notice && (
          <p className="info-note" role="status">
            {notice}
          </p>
        )}
        {form ? (
          <section className="panel team-form">
            <button
              className="text-link"
              disabled={busy}
              onClick={() => setForm("")}
            >
              ← Back
            </button>
            <h1>
              {form === "Payment"
                ? "Request a payment"
                : form === "Reimbursement"
                  ? "I paid — claim reimbursement"
                  : form === "daily"
                    ? "Today’s site note"
                    : "Record today’s attendance"}
            </h1>
            <form onSubmit={submit} key={form}>
              {(form === "Payment" || form === "Reimbursement") && (
                <>
                  <p className="field-hint">
                    {form === "Payment"
                      ? "Ask the owner to pay for work or materials."
                      : "Record money you already spent personally. The owner reviews it before reimbursing you."}
                  </p>
                  <div className="quick-presets">
                    {quickItems.map((item) => (
                      <button
                        type="button"
                        key={item.title}
                        onClick={(e) => {
                          setPreset(item.title);
                          const f = e.currentTarget.form;
                          if (f) {
                            (
                              f.elements.namedItem("title") as HTMLInputElement
                            ).value = item.title;
                            (
                              f.elements.namedItem(
                                "category",
                              ) as HTMLSelectElement
                            ).value = item.category;
                          }
                        }}
                      >
                        {item.title}
                      </button>
                    ))}
                  </div>
                  <label>
                    What is this for?
                    <input
                      name="title"
                      required
                      maxLength={150}
                      defaultValue={preset}
                      placeholder="e.g. Temporary shed materials"
                    />
                  </label>
                  <label>
                    Amount ({project.currency})
                    <input
                      name="amount"
                      type="number"
                      min="0.01"
                      step="0.01"
                      inputMode="decimal"
                      required
                    />
                  </label>
                  <label>
                    Category
                    <select
                      name="category"
                      defaultValue={
                        quickItems.find((p) => p.title === preset)?.category ||
                        "Materials"
                      }
                    >
                      {[
                        "Materials",
                        "Labour",
                        "Contractor",
                        "Design",
                        "Permits",
                        "Equipment",
                        "Other",
                      ].map((c) => (
                        <option key={c}>{c}</option>
                      ))}
                    </select>
                  </label>
                  {form === "Reimbursement" && (
                    <label>
                      When did you pay?
                      <input
                        name="spentDate"
                        type="date"
                        required
                        max={day()}
                        defaultValue={day()}
                      />
                    </label>
                  )}
                  <label>
                    Needed by
                    <input
                      name="due"
                      type="date"
                      required
                      defaultValue={day()}
                    />
                  </label>
                  <label>
                    Bill / proof (optional)
                    <input
                      name="file"
                      type="file"
                      accept="application/pdf,image/png,image/jpeg,image/webp"
                    />
                    <small>PDF or photo, up to 3 MB.</small>
                  </label>
                </>
              )}
              {form === "daily" && (
                <label>
                  What happened?
                  <input
                    name="title"
                    required
                    maxLength={150}
                    placeholder="e.g. Foundation inspection completed"
                  />
                </label>
              )}
              {form === "attendance" && (
                <label>
                  Today I’m
                  <select name="status">
                    <option>On site</option>
                    <option>Remote work</option>
                  </select>
                </label>
              )}
              <StageSelect stages={project.stages} />
              <label>
                {form === "daily"
                  ? "Work completed / issues"
                  : "Note (optional)"}
                <textarea
                  name="note"
                  required={form === "daily"}
                  maxLength={form === "attendance" ? 1000 : 3000}
                  rows={3}
                />
              </label>
              <button className="button primary full" disabled={busy}>
                {busy
                  ? "Saving…"
                  : form === "Payment" || form === "Reimbursement"
                    ? "Send to owner"
                    : "Save"}
              </button>
            </form>
          </section>
        ) : (
          <>
            {tab === "home" && (
              <>
                <h1>{project.name}</h1>
                <BuildView stages={project.stages} />
                {!project.stages.length && (
                  <p>The owner hasn’t added stages yet.</p>
                )}
                {project.stages.map((s) => (
                  <article className="team-record" key={s.id}>
                    <div className="spread">
                      <strong>{s.title}</strong>
                      <span>{s.progress}%</span>
                    </div>
                    <div className="progress">
                      <span style={{ width: Number(s.progress) + "%" }} />
                    </div>
                    {s.due && <small>Target {s.due}</small>}
                  </article>
                ))}
                <h2>Shared updates</h2>
                {project.updates
                  .filter((r) => r.shared === "yes")
                  .map((r) => (
                    <article className="team-record" key={r.id}>
                      <small>
                        {r.date} · {r.author}
                      </small>
                      <h3>{r.title}</h3>
                      <p>{r.note}</p>
                      {r.fileId && (
                        <a
                          href={"/api/files/" + r.fileId}
                          target="_blank"
                          rel="noreferrer"
                        >
                          Open attachment
                        </a>
                      )}
                    </article>
                  ))}
                {!project.updates.some((r) => r.shared === "yes") && (
                  <p className="field-hint">
                    Updates will appear when the owner shares them.
                  </p>
                )}
                <p className="field-hint">
                  Project funds, budgets and the expense ledger are private to
                  the owner.
                </p>
                <button className="button" onClick={() => run(onLogout)}>
                  <LogOut size={17} /> Sign out
                </button>
              </>
            )}
            {canWork && tab === "requests" && (
              <>
                <h1>My requests</h1>
                <div className="team-actions">
                  <button
                    className="button primary"
                    onClick={() => {
                      setPreset("");
                      setForm("Payment");
                    }}
                  >
                    Request payment
                  </button>
                  <button
                    className="button"
                    onClick={() => {
                      setPreset("");
                      setForm("Reimbursement");
                    }}
                  >
                    I paid — reimburse me
                  </button>
                </div>
                <p className="field-hint">
                  Only you and the owner see these requests. “Paid” records the
                  owner’s confirmation; ILLAM does not transfer money.
                </p>
                {!project.payments.length && <p>No requests yet.</p>}
                {project.payments.map((r) => (
                  <article className="team-record" key={r.id}>
                    <div className="spread">
                      <small>{r.requestType || "Payment"}</small>
                      <span className="badge">{r.status}</span>
                    </div>
                    <h3>{r.title}</h3>
                    <strong>{money(Number(r.amount), project.currency)}</strong>
                    <p>{r.note}</p>
                    <small>Needed by {r.due}</small>
                    {r.spentDate && (
                      <small>Paid personally on {r.spentDate}</small>
                    )}
                    {r.reviewNote && <p>Owner’s note: {r.reviewNote}</p>}
                    {r.paymentReference && (
                      <small>Payment reference: {r.paymentReference}</small>
                    )}
                    {r.paidAt && (
                      <small>Marked paid {String(r.paidAt).slice(0, 10)}</small>
                    )}
                    {r.fileId && (
                      <a
                        href={"/api/files/" + r.fileId}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Open your bill
                      </a>
                    )}
                  </article>
                ))}
              </>
            )}
            {canWork && tab === "attendance" && (
              <>
                <h1>My attendance</h1>
                <p className="field-hint">
                  Self-reported visits, visible to the owner. This does not
                  verify location or calculate wages.
                </p>
                {today ? (
                  <article className="team-record">
                    <strong>Today · {today.status}</strong>
                    <p>
                      {today.checkOutAt
                        ? "Visit completed"
                        : today.checkInAt
                          ? "Checked in"
                          : "Recorded by owner"}
                    </p>
                    {today.checkInAt && !today.checkOutAt && (
                      <button
                        className="button primary"
                        disabled={busy}
                        onClick={() => run(() => send({ action: "checkout" }))}
                      >
                        Check out
                      </button>
                    )}
                  </article>
                ) : (
                  <button
                    className="button primary"
                    onClick={() => setForm("attendance")}
                  >
                    Check in / record today
                  </button>
                )}
                {(project.attendance || []).map((r) => (
                  <article className="team-record" key={r.id}>
                    <strong>
                      {r.date} · {r.status}
                    </strong>
                    <p>{r.note}</p>
                    <small>
                      {r.confirmed === "yes"
                        ? "Confirmed by owner"
                        : "Awaiting owner confirmation"}
                    </small>
                  </article>
                ))}
              </>
            )}
            {canWork && tab === "notes" && (
              <>
                <h1>My daily notes</h1>
                <button
                  className="button primary"
                  onClick={() => setForm("daily")}
                >
                  Add today’s note
                </button>
                <p className="field-hint">
                  Private to you and the owner until the owner shares it with
                  the team.
                </p>
                {project.updates.map((r) => (
                  <article className="team-record" key={r.id}>
                    <small>
                      {r.date} · {r.author}
                    </small>
                    <h3>{r.title}</h3>
                    <p>{r.note}</p>
                  </article>
                ))}
              </>
            )}
          </>
        )}
      </main>
      <nav className="bottom-nav team-nav" aria-label="Team navigation">
        {[
          { id: "home", label: "Progress", Icon: House },
          ...(canWork
            ? [
                { id: "requests", label: "Requests", Icon: ClipboardList },
                { id: "attendance", label: "Attendance", Icon: Users },
                { id: "notes", label: "Notes", Icon: NotebookPen },
              ]
            : []),
        ].map(({ id, label, Icon }) => (
          <button
            className={tab === id ? "active" : ""}
            key={id}
            onClick={() => {
              setTab(id);
              setForm("");
              setNotice("");
              window.scrollTo(0, 0);
            }}
          >
            <Icon size={23} />
            <span>{label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}
