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
import MaterialWorkspace from "./material-workspace";
import { materialAlerts, materialStatus } from "@/lib/materials";
import ProjectMessages from "./project-messages";
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
  onChooseProjects,
  onLogout,
}: {
  project: Project;
  active: { id: string; role: string; revision: number };
  userId: string;
  projects: { id: string; name: string; role: string }[];
  onChooseProjects: () => void;
  onRefresh: () => Promise<void>;
  onSwitch: (id: string) => Promise<void>;
  onLogout: () => Promise<void>;
}) {
  const [tab, setTab] = useState(
      active.role === "contractor" ? "attendance" : "home",
    ),
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
          noteType: String(values.get("noteType") || "Site note"),
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
          aria-label="Switch project"
          value={active.id}
          disabled={busy}
          onChange={(e) =>
            run(async () => {
              await onSwitch(e.target.value);
              setForm("");
              setTab(active.role === "contractor" ? "attendance" : "home");
            })
          }
        >
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name} · {p.role}
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
        {projects.length > 1 && (
          <button className="button" disabled={busy} onClick={onChooseProjects}>
            All my projects ({projects.length})
          </button>
        )}
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
        {!form && canWork && tab !== "materials" && (
          <button
            className="material-alert-button"
            onClick={() => setTab("materials")}
          >
            Materials · {materialAlerts(project).filter((a) => a.low).length}{" "}
            low / out of stock ·{" "}
            {
              (project.materialRequests || []).filter(
                (r) =>
                  r.expectedDate &&
                  String(r.expectedDate) < day() &&
                  !["Received", "Rejected", "Cancelled"].includes(
                    materialStatus(project, r),
                  ),
              ).length
            }{" "}
            overdue deliveries →
          </button>
        )}
        {form ? (
          <section
            className={
              "panel team-form " +
              (["Payment", "Reimbursement"].includes(form)
                ? "payment-request-form"
                : "")
            }
          >
            <button
              className="text-link"
              disabled={busy}
              onClick={() => setForm("")}
            >
              {form === "Payment" || form === "Reimbursement"
                ? "← Back to requests"
                : "← Back"}
            </button>
            <h1>
              {form === "Payment"
                ? "Request a payment"
                : form === "Reimbursement"
                  ? "Claim reimbursement"
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
                  <label className="request-amount">
                    {form === "Reimbursement"
                      ? "Amount you paid"
                      : "Amount requested"}
                    <span className="request-amount-field">
                      <span>
                        {project.currency === "INR" ? "₹" : project.currency}
                      </span>
                      <input
                        name="amount"
                        aria-label={"Amount in " + project.currency}
                        type="number"
                        min="0.01"
                        step="0.01"
                        inputMode="decimal"
                        required
                        placeholder="0.00"
                      />
                    </span>
                  </label>
                  <label>
                    What is this for?
                    <input
                      name="title"
                      required
                      maxLength={150}
                      defaultValue={preset}
                      placeholder="e.g. CCTV camera for the site"
                    />
                  </label>
                  <details className="request-shortcuts">
                    <summary>Choose a common site expense</summary>
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
                                f.elements.namedItem(
                                  "title",
                                ) as HTMLInputElement
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
                  </details>
                  <div className="request-details-grid">
                    <label>
                      Category
                      <select
                        name="category"
                        defaultValue={
                          quickItems.find((p) => p.title === preset)
                            ?.category || "Materials"
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
                  </div>
                  <label className="request-attachment">
                    <span>
                      Attach a bill or photo <small>Optional</small>
                    </span>
                    <input
                      name="file"
                      type="file"
                      accept="application/pdf,image/png,image/jpeg,image/webp"
                    />
                    <small>PDF, JPG, PNG or WebP · up to 3 MB</small>
                  </label>
                </>
              )}
              {form === "daily" && (
                <>
                  <label>
                    Type
                    <select name="noteType">
                      <option>Site note</option>
                      <option>Blocker</option>
                    </select>
                  </label>
                  <label>
                    What happened?
                    <input
                      name="title"
                      required
                      maxLength={150}
                      placeholder="e.g. Cement needed before tomorrow"
                    />
                  </label>
                </>
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
                  placeholder={
                    form === "Payment" || form === "Reimbursement"
                      ? "Anything the owner should know?"
                      : undefined
                  }
                />
              </label>
              <div
                className={
                  form === "Payment" || form === "Reimbursement"
                    ? "request-submit"
                    : ""
                }
              >
                {(form === "Payment" || form === "Reimbursement") && (
                  <p>Only you and the owner can see this request.</p>
                )}
                <button className="button primary full" disabled={busy}>
                  {busy
                    ? "Saving…"
                    : form === "Payment" || form === "Reimbursement"
                      ? "Send to owner"
                      : "Save"}
                </button>
              </div>
            </form>
          </section>
        ) : (
          <>
            {tab === "home" && active.role !== "contractor" && (
              <>
                <h1>{project.name}</h1>
                <BuildView stages={project.stages} />
                {active.role === "architect" && (
                  <section className="architect-spending">
                    <p className="eyebrow">Project spending</p>
                    <strong>
                      {money(
                        project.transactions.reduce(
                          (sum, r) => sum + Number(r.amount || 0),
                          0,
                        ),
                        project.currency,
                      )}
                    </strong>
                    <p className="field-hint">
                      Recorded expenses after removals. Unpaid requests are not
                      included.
                    </p>
                    <details>
                      <summary>
                        View expenses ({project.transactions.length})
                      </summary>
                      {!project.transactions.length && (
                        <p>No expenses recorded yet.</p>
                      )}
                      {project.transactions.map((r) => (
                        <article className="team-record" key={r.id}>
                          <div className="spread">
                            <span>{r.party || r.category || "Expense"}</span>
                            <b>{money(Number(r.amount), project.currency)}</b>
                          </div>
                          <small>
                            {r.date} · {r.category} ·{" "}
                            {project.stages.find((s) => s.id === r.stageId)
                              ?.title || "Whole project"}
                          </small>
                        </article>
                      ))}
                    </details>
                  </section>
                )}

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
                  Owner reserves, fund balances, incoming money and account
                  details are private to the owner.
                </p>
                <button className="button" onClick={() => run(onLogout)}>
                  <LogOut size={17} /> Sign out
                </button>
              </>
            )}
            {canWork && tab === "materials" && (
              <MaterialWorkspace
                project={project}
                projectId={active.id}
                revision={active.revision}
                role={active.role}
                onRefresh={onRefresh}
              />
            )}
            {canWork && tab === "messages" && (
              <ProjectMessages
                key={active.id}
                projectId={active.id}
                userId={userId}
              />
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
                    {r.deletedAt && (
                      <p>
                        Removed by owner: {r.deletionReason}. Excluded from
                        active totals.
                      </p>
                    )}
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
                <h1>Site notes & needs</h1>
                <p className="field-hint">
                  For cement, bricks or other stock requests, use Materials so
                  quantities and deliveries stay linked.
                </p>
                <button
                  className="button primary"
                  onClick={() => setForm("daily")}
                >
                  Add a note, blocker or material request
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
        {active.role === "contractor" && (
          <button className="text-link" onClick={() => run(onLogout)}>
            Sign out
          </button>
        )}
      </main>
      <nav className="bottom-nav team-nav" aria-label="Team navigation">
        {[
          ...(active.role !== "contractor"
            ? [{ id: "home", label: "Progress", Icon: House }]
            : []),
          ...(canWork
            ? [
                { id: "requests", label: "Requests", Icon: ClipboardList },
                { id: "materials", label: "Materials", Icon: ClipboardList },
                { id: "attendance", label: "Attendance", Icon: Users },
                { id: "notes", label: "Site notes", Icon: NotebookPen },
                { id: "messages", label: "Messages", Icon: NotebookPen },
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
