"use client";
import { useState, useRef, type FormEvent } from "react";
import { day, type Project, type Row, money } from "@/lib/model";
import {
  activeMaterials,
  materialStock,
  materialStatus,
  materialAlerts,
  requestReceived,
  materialUnits,
  materialPresets,
  materialKey,
} from "@/lib/materials";
import StageSelect from "./stage-select";
export default function MaterialWorkspace({
  project,
  projectId,
  revision,
  role,
  onRefresh,
}: {
  project: Project;
  projectId: string;
  revision: number;
  role: string;
  onRefresh: () => Promise<void>;
}) {
  const owner = role === "owner",
    catalog = activeMaterials(project),
    requests = project.materialRequests || [],
    moves = project.materialMovements || [],
    suggestions = project.materialSuggestions || [];
  const [tab, setTab] = useState("stock"),
    [search, setSearch] = useState(""),
    [form, setForm] = useState(""),
    [selected, setSelected] = useState(""),
    [requestId, setRequestId] = useState(""),
    [suggestionId, setSuggestionId] = useState(""),
    [preset, setPreset] = useState({ title: "", spec: "", unit: "bags" }),
    [stage, setStage] = useState(""),
    [kind, setKind] = useState("Delivery"),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [busy, setBusy] = useState(false);
  const lock = useRef(false),
    m = catalog.find((r) => r.id === selected),
    r = requests.find((r) => r.id === requestId),
    alerts = materialAlerts(project);
  const open = requests.filter(
      (r) =>
        !["Received", "Cancelled", "Rejected"].includes(
          materialStatus(project, r),
        ),
    ),
    duplicates = open.filter(
      (r) => r.materialId === selected && String(r.stageId || "") === stage,
    );
  function start(type: string, mid = "", rid = "") {
    setForm(type);
    setSelected(mid || catalog[0]?.id || "");
    setRequestId(rid);
    setStage(String(requests.find((r) => r.id === rid)?.stageId || ""));
    setKind("Delivery");
    setError("");
    setNotice("");
    setSuggestionId("");
    window.scrollTo(0, 0);
  }
  async function send(entry: unknown) {
    const res = await fetch("/api/materials", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectId, revision, entry }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    await onRefresh();
  }
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError("");
    const f = new FormData(e.currentTarget),
      v = (k: string) => String(f.get(k) || "");
    try {
      let uploadedId = "",
        uploadedName = "";
      const attachment = f.get("file");
      if (attachment instanceof File && attachment.size) {
        if (attachment.size > 3 * 1024 * 1024)
          throw new Error("Choose a photo or PDF under 3 MB.");
        const upload = new FormData();
        upload.set("file", attachment);
        upload.set("projectId", projectId);
        const response = await fetch("/api/files", {
            method: "POST",
            body: upload,
          }),
          result = await response.json();
        if (!response.ok) throw new Error(result.error);
        uploadedId = result.id;
        uploadedName = attachment.name;
      }
      let entry: Record<string, unknown> = {
        action: form,
        id: crypto.randomUUID(),
      };
      if (form === "create" || form === "suggest")
        entry = {
          ...entry,
          title: v("title"),
          spec: v("spec"),
          unit: v("unit"),
          reorder: Number(f.get("reorder") || 0),
          note: v("note"),
          suggestionId,
        };
      if (form === "threshold")
        entry = {
          action: form,
          materialId: selected,
          reorder: Number(f.get("reorder")),
        };
      if (form === "request")
        entry = {
          ...entry,
          materialId: selected,
          quantity: Number(f.get("quantity")),
          stageId: stage,
          neededBy: v("neededBy"),
          note: v("note"),
          duplicateReason: v("duplicateReason"),
          fileId: uploadedId,
          fileName: uploadedName,
        };
      if (form === "review")
        entry = {
          action: form,
          requestId,
          status: v("status"),
          note: v("note"),
        };
      if (form === "order")
        entry = {
          action: form,
          requestId,
          supplier: v("supplier"),
          expectedDate: v("expectedDate"),
          expenseId: v("expenseId"),
        };
      if (form === "linkExpense")
        entry = { action: form, requestId, expenseId: v("expenseId") };
      if (form === "merge")
        entry = {
          action: form,
          sourceId: selected,
          targetId: v("targetId"),
          note: v("note"),
        };
      if (form === "movement") {
        entry = {
          ...entry,
          materialId: selected,
          kind,
          quantity: Number(f.get("quantity")),
          date: v("date"),
          stageId: v("stageId"),
          requestId: kind === "Delivery" ? requestId : "",
          note: v("note"),
          fileId: uploadedId,
          fileName: uploadedName,
        };
      }
      await send(entry);
      setForm("");
      setNotice("Saved to the shared material register.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save.");
    } finally {
      setBusy(false);
      lock.current = false;
    }
  }
  const matName = (mid: unknown) => {
    const item = project.materials.find((m) => m.id === mid);
    return item
      ? String(item.title) + (item.spec ? " · " + item.spec : "")
      : "Material";
  };
  return (
    <section className="material-workspace">
      <div className="section-heading">
        <h2>Materials</h2>
        <button
          className="text-link"
          disabled={busy}
          onClick={() => onRefresh().catch((e) => setError(e.message))}
        >
          Refresh
        </button>
      </div>
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
        <form
          className="team-form"
          onSubmit={submit}
          key={form + selected + requestId + suggestionId}
        >
          <button
            type="button"
            className="text-link"
            disabled={busy}
            onClick={() => setForm("")}
          >
            ← Back to materials
          </button>
          <h2>
            {
              {
                create: "Add a material",
                suggest: "Suggest a missing material",
                request: "Request material",
                movement: "Record stock movement",
                review: "Review request",
                order: "Record order",
                threshold: "Low-stock level",
                merge: "Merge duplicate entries",
                linkExpense: "Link recorded expense",
              }[form]
            }
          </h2>
          {(form === "create" || form === "suggest") && (
            <>
              <p className="field-hint">
                One entry per material and specification. Units stay fixed;
                don’t mix bags, tonnes or loads.
              </p>
              {form === "create" && (
                <div className="quick-presets">
                  {materialPresets.map((p, i) => (
                    <button
                      type="button"
                      key={i}
                      onClick={(e) => {
                        const f = e.currentTarget.form!;
                        (
                          f.elements.namedItem("title") as HTMLInputElement
                        ).value = p.title;
                        (
                          f.elements.namedItem("spec") as HTMLInputElement
                        ).value = p.spec;
                        (
                          f.elements.namedItem("unit") as HTMLSelectElement
                        ).value = p.unit;
                      }}
                    >
                      {p.title} {p.spec}
                    </button>
                  ))}
                </div>
              )}
              <label>
                Material name
                <input
                  name="title"
                  required
                  maxLength={100}
                  defaultValue={preset.title}
                />
              </label>
              <label>
                Specification / grade / size
                <input
                  name="spec"
                  maxLength={100}
                  defaultValue={preset.spec}
                  placeholder="e.g. OPC 53, 20 mm, 12 mm"
                />
              </label>
              <label>
                Stock unit
                <select name="unit" defaultValue={preset.unit}>
                  {materialUnits.map((u) => (
                    <option key={u}>{u}</option>
                  ))}
                </select>
              </label>
              {form === "create" && (
                <label>
                  Alert at or below
                  <input
                    name="reorder"
                    type="number"
                    min="0"
                    step="any"
                    defaultValue="0"
                    required
                  />
                </label>
              )}
              {form === "suggest" && (
                <label>
                  Why is this needed?
                  <textarea name="note" maxLength={1000} />
                </label>
              )}
            </>
          )}
          {["request", "movement"].includes(form) && (
            <>
              <label>
                Material
                <select
                  value={selected}
                  disabled={!!requestId}
                  onChange={(e) => setSelected(e.target.value)}
                  required
                >
                  {catalog.map((m) => (
                    <option value={m.id} key={m.id}>
                      {matName(m.id)} · {m.unit}
                    </option>
                  ))}
                </select>
              </label>
              <p className="info-note">
                Available: {materialStock(project, selected)} {m?.unit}.{" "}
                {open.filter((r) => r.materialId === selected).length} open
                requests.
              </p>
            </>
          )}
          {form === "request" && (
            <>
              <label>
                Quantity ({m?.unit})
                <input
                  name="quantity"
                  type="number"
                  min="0.001"
                  step="any"
                  required
                />
              </label>
              <StageSelect
                stages={project.stages}
                value={stage}
                onChange={setStage}
              />
              <label>
                Needed by
                <input
                  name="neededBy"
                  type="date"
                  defaultValue={day()}
                  required
                />
              </label>
              {duplicates.length > 0 && (
                <div className="material-warning">
                  <strong>
                    A request already exists for this material and stage.
                  </strong>
                  {duplicates.map((r) => (
                    <p key={r.id}>
                      {r.person}: {r.quantity} {m?.unit} ·{" "}
                      {materialStatus(project, r)} · {r.neededBy}
                    </p>
                  ))}
                  <button
                    type="button"
                    className="text-link"
                    onClick={() => {
                      setForm("");
                      setTab("requests");
                    }}
                  >
                    View existing requests
                  </button>
                  <label>
                    Why is another request needed?
                    <textarea
                      name="duplicateReason"
                      required
                      maxLength={1000}
                    />
                  </label>
                </div>
              )}
              <label>
                Note
                <textarea
                  name="note"
                  maxLength={1000}
                  placeholder="Delivery instructions or reason"
                />
              </label>
              <label>
                Photo (optional)
                <input
                  name="file"
                  type="file"
                  accept="application/pdf,image/png,image/jpeg,image/webp"
                />
                <small>Shared with the site team · up to 3 MB.</small>
              </label>
            </>
          )}
          {form === "movement" && (
            <>
              <label>
                Movement
                <select
                  value={kind}
                  disabled={!!requestId}
                  onChange={(e) => setKind(e.target.value)}
                >
                  {[
                    "Delivery",
                    "Usage",
                    "Wastage",
                    "Return",
                    ...(owner ? ["Correction"] : []),
                  ].map((k) => (
                    <option key={k}>{k}</option>
                  ))}
                </select>
              </label>
              {requestId && (
                <p className="info-note">
                  Against request:{" "}
                  {Number(r?.quantity) - requestReceived(project, requestId)}{" "}
                  {m?.unit} still due. Partial deliveries are allowed.
                </p>
              )}
              {!requestId && kind === "Delivery" && (
                <p className="field-hint">
                  This is an unplanned delivery. To fulfil an order, use
                  “Receive delivery” on its request.
                </p>
              )}
              <label>
                {kind === "Correction"
                  ? "Adjustment (+ add / − subtract)"
                  : "Quantity"}{" "}
                ({m?.unit})
                <input
                  name="quantity"
                  type="number"
                  min={kind === "Correction" ? undefined : "0.001"}
                  step="any"
                  required
                />
              </label>
              <label>
                Date
                <input
                  name="date"
                  type="date"
                  defaultValue={day()}
                  max={day()}
                  required
                />
              </label>
              <StageSelect
                stages={project.stages}
                value={stage}
                onChange={setStage}
              />
              <label>
                {kind === "Correction"
                  ? "Correction reason"
                  : "Note / delivery reference"}
                <textarea
                  name="note"
                  required={kind === "Correction"}
                  maxLength={1000}
                />
              </label>
              <label>
                Photo or delivery note (optional)
                <input
                  name="file"
                  type="file"
                  accept="application/pdf,image/png,image/jpeg,image/webp"
                />
                <small>
                  Shared with the site team. Use a delivery note without private
                  payment details. Up to 3 MB.
                </small>
              </label>
            </>
          )}
          {form === "review" && (
            <>
              <p>
                {matName(r?.materialId)} · {r?.quantity} · {r?.person}
              </p>
              <label>
                Decision
                <select name="status">
                  {r?.status === "Requested" ? (
                    <>
                      <option>Approved</option>
                      <option>Rejected</option>
                      <option>Cancelled</option>
                    </>
                  ) : (
                    <option>Cancelled</option>
                  )}
                </select>
              </label>
              <label>
                Reason / note
                <textarea name="note" maxLength={1000} />
              </label>
              <p className="field-hint">
                Approving does not add stock. Cancellation stops the remaining
                order; received stock is kept.
              </p>
            </>
          )}
          {form === "order" && (
            <>
              <p>
                {matName(r?.materialId)} · {r?.quantity}
              </p>
              <label>
                Supplier
                <input name="supplier" required maxLength={150} />
              </label>
              <label>
                Expected delivery
                <input
                  name="expectedDate"
                  type="date"
                  required
                  defaultValue={day()}
                />
              </label>
              <label>
                Link an existing expense (optional)
                <select name="expenseId">
                  <option value="">No expense yet</option>
                  {project.transactions
                    .filter(
                      (t) =>
                        t.kind === "Expense" &&
                        !requests.some((r) => r.expenseId === t.id),
                    )
                    .map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.party} · {money(Number(t.amount), project.currency)}{" "}
                        · {t.date}
                      </option>
                    ))}
                </select>
              </label>
              <p className="field-hint">
                Ordering and receiving never create an expense automatically.
                Record it once in Money; a linked expense is not counted again.
              </p>
            </>
          )}
          {form === "linkExpense" && (
            <>
              <label>
                Expense
                <select name="expenseId" required>
                  <option value="">Choose an existing expense</option>
                  {project.transactions
                    .filter(
                      (t) =>
                        t.kind === "Expense" &&
                        !requests.some(
                          (r) => r.id !== requestId && r.expenseId === t.id,
                        ),
                    )
                    .map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.party} · {money(Number(t.amount), project.currency)}{" "}
                        · {t.date}
                      </option>
                    ))}
                </select>
              </label>
              <p className="field-hint">
                Record the purchase once in Money first. Linking it here does
                not add another expense.
              </p>
            </>
          )}
          {form === "threshold" && (
            <label>
              Alert at or below ({m?.unit})
              <input
                name="reorder"
                type="number"
                min="0"
                step="any"
                defaultValue={Number(m?.reorder || 0)}
                required
              />
            </label>
          )}
          {form === "merge" && (
            <>
              <p>
                Merge {matName(selected)} into the matching entry below. Stock
                and requests are combined; the old entry remains in history.
              </p>
              <label>
                Keep this entry
                <select name="targetId" required>
                  {catalog
                    .filter(
                      (t) =>
                        t.id !== selected &&
                        t.unit === m?.unit &&
                        materialKey(String(t.title), String(t.spec || "")) ===
                          materialKey(String(m?.title), String(m?.spec || "")),
                    )
                    .map((t) => (
                      <option key={t.id} value={t.id}>
                        {matName(t.id)} · {materialStock(project, t.id)}{" "}
                        {t.unit}
                      </option>
                    ))}
                </select>
              </label>
              <label>
                Reason
                <textarea name="note" required maxLength={1000} />
              </label>
            </>
          )}
          <button className="button primary full" disabled={busy}>
            {busy
              ? "Saving…"
              : form === "merge"
                ? "Confirm merge"
                : form === "request"
                  ? "Send material request"
                  : form === "suggest"
                    ? "Send suggestion"
                    : "Save"}
          </button>
        </form>
      ) : (
        <>
          <div className="material-summary">
            <span>{alerts.filter((a) => a.low).length} low / out of stock</span>
            <span>{open.length} open requests</span>
            <span>
              {
                open.filter(
                  (r) => r.expectedDate && String(r.expectedDate) < day(),
                ).length
              }{" "}
              deliveries overdue
            </span>
            {owner && (
              <span>
                {requests.filter((r) => r.status === "Requested").length}{" "}
                awaiting approval
              </span>
            )}
          </div>
          <div
            className="material-tabs"
            role="navigation"
            aria-label="Materials sections"
          >
            {["stock", "requests", "history"].map((t) => (
              <button
                key={t}
                className={"button " + (tab === t ? "primary" : "")}
                onClick={() => setTab(t)}
              >
                {t === "stock"
                  ? "Stock"
                  : t === "requests"
                    ? "Requests"
                    : "Movements"}
              </button>
            ))}
          </div>
          {tab === "stock" && (
            <>
              <label className="material-search">
                Find material
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Cement, brick, msand, jalli…"
                />
              </label>
              <div className="team-actions">
                <button
                  className="button"
                  onClick={() => {
                    setPreset({ title: "", spec: "", unit: "bags" });
                    start(owner ? "create" : "suggest");
                  }}
                >
                  {owner ? "+ Add material" : "Suggest missing material"}
                </button>
                {catalog.length > 0 && (
                  <button
                    className="button primary"
                    onClick={() => start("request")}
                  >
                    Request material
                  </button>
                )}
              </div>
              {!catalog.length && (
                <p className="info-note">
                  No materials yet.{" "}
                  {owner
                    ? "Add the material and specification first, then record actual deliveries."
                    : "Ask the owner to add materials, or suggest one above."}{" "}
                  No sample stock has been added.
                </p>
              )}
              {catalog
                .filter(
                  (m) =>
                    !search ||
                    materialKey(String(m.title), String(m.spec || "")).includes(
                      materialKey(search).split("|")[0],
                    ) ||
                    (String(m.title) + " " + String(m.spec || ""))
                      .toLowerCase()
                      .includes(search.toLowerCase()),
                )
                .map((m) => {
                  const stock = materialStock(project, m.id),
                    a = alerts.find((a) => a.id === m.id)!,
                    pending = open.filter((r) => r.materialId === m.id);
                  return (
                    <article className="material-card" key={m.id}>
                      <div className="spread">
                        <h3>{matName(m.id)}</h3>
                        <span className={"badge " + (a.low ? "amber" : "")}>
                          {stock <= 0
                            ? "Out of stock"
                            : a.low
                              ? "Low stock"
                              : "In stock"}
                        </span>
                      </div>
                      <strong className="material-quantity">
                        {stock.toLocaleString()}{" "}
                        <small>{m.unit} available</small>
                      </strong>
                      <p className="field-hint">
                        Minimum {m.reorder || 0} {m.unit}
                        {a.stale
                          ? " · Stock needs checking (no update in 7 days)"
                          : ""}
                      </p>
                      {pending.map((r) => (
                        <small className="material-order" key={r.id}>
                          {materialStatus(project, r)}:{" "}
                          {Number(r.quantity) - requestReceived(project, r.id)}{" "}
                          {m.unit}
                          {r.expectedDate
                            ? " · expected " + r.expectedDate
                            : ""}
                        </small>
                      ))}
                      <div className="team-actions">
                        <button
                          className="button primary"
                          onClick={() => start("request", m.id)}
                        >
                          Request
                        </button>
                        <button
                          className="button"
                          onClick={() => start("movement", m.id)}
                        >
                          Delivery / usage
                        </button>
                        {owner && (
                          <button
                            className="text-link"
                            onClick={() => start("threshold", m.id)}
                          >
                            Set minimum
                          </button>
                        )}
                        {owner &&
                          catalog.some(
                            (t) =>
                              t.id !== m.id &&
                              t.unit === m.unit &&
                              materialKey(
                                String(t.title),
                                String(t.spec || ""),
                              ) ===
                                materialKey(
                                  String(m.title),
                                  String(m.spec || ""),
                                ),
                          ) && (
                            <button
                              className="text-link"
                              onClick={() => start("merge", m.id)}
                            >
                              Merge duplicate
                            </button>
                          )}
                      </div>
                    </article>
                  );
                })}
              {suggestions.filter((s) => s.status === "Pending").length > 0 && (
                <section>
                  <h3>Suggested materials</h3>
                  {suggestions
                    .filter((s) => s.status === "Pending")
                    .map((s) => (
                      <article className="team-record" key={s.id}>
                        <strong>
                          {s.title} · {s.spec} · {s.unit}
                        </strong>
                        <p>
                          {s.person}: {s.note}
                        </p>
                        {owner && (
                          <button
                            className="button"
                            onClick={() => {
                              start("create");
                              setSuggestionId(s.id);
                              setPreset({
                                title: String(s.title),
                                spec: String(s.spec || ""),
                                unit: String(s.unit),
                              });
                            }}
                          >
                            Add to register
                          </button>
                        )}
                      </article>
                    ))}
                </section>
              )}
            </>
          )}
          {tab === "requests" && (
            <>
              {!requests.length && <p>No material requests yet.</p>}
              {[...requests].reverse().map((r) => {
                const status = materialStatus(project, r),
                  mat = catalog.find((m) => m.id === r.materialId);
                return (
                  <article className="material-card" key={r.id}>
                    <div className="spread">
                      <h3>{matName(r.materialId)}</h3>
                      <span className="badge">{status}</span>
                    </div>
                    <strong>
                      {r.quantity} {mat?.unit}
                    </strong>
                    <p>
                      {r.person} · needed {r.neededBy}
                    </p>
                    <small>
                      {project.stages.find((s) => s.id === r.stageId)?.title ||
                        "Whole project"}
                    </small>
                    <p>{r.note}</p>
                    {r.fileId && (
                      <a
                        href={"/api/files/" + r.fileId}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Request photo
                      </a>
                    )}
                    {r.duplicateReason && (
                      <p>Separate request: {r.duplicateReason}</p>
                    )}
                    {r.expectedDate && (
                      <p>
                        {r.supplier} · expected {r.expectedDate}
                        {String(r.expectedDate) < day() &&
                        !["Received", "Cancelled", "Rejected"].includes(status)
                          ? " · OVERDUE"
                          : ""}
                      </p>
                    )}
                    <p>
                      {requestReceived(project, r.id)} received ·{" "}
                      {Math.max(
                        0,
                        Number(r.quantity) - requestReceived(project, r.id),
                      )}{" "}
                      outstanding
                    </p>
                    {r.reviewNote && <p>Owner: {r.reviewNote}</p>}
                    {owner && r.expenseId && (
                      <p className="field-hint">
                        Expense linked
                        {project.transactions.some((t) => t.id === r.expenseId)
                          ? " (counted once in Money)"
                          : " — the financial entry was removed"}
                      </p>
                    )}
                    <div className="team-actions">
                      {owner &&
                        ["Ordered", "Part received", "Received"].includes(
                          status,
                        ) && (
                          <button
                            className="text-link"
                            onClick={() =>
                              start("linkExpense", String(r.materialId), r.id)
                            }
                          >
                            Link expense
                          </button>
                        )}
                      {owner && status === "Requested" && (
                        <button
                          className="button primary"
                          onClick={() =>
                            start("review", String(r.materialId), r.id)
                          }
                        >
                          Review request
                        </button>
                      )}
                      {owner && status === "Approved" && (
                        <button
                          className="button primary"
                          onClick={() =>
                            start("order", String(r.materialId), r.id)
                          }
                        >
                          Record order
                        </button>
                      )}
                      {["Ordered", "Part received"].includes(status) && (
                        <button
                          className="button primary"
                          onClick={() =>
                            start("movement", String(r.materialId), r.id)
                          }
                        >
                          Receive delivery
                        </button>
                      )}
                      {owner &&
                        ["Approved", "Ordered", "Part received"].includes(
                          status,
                        ) && (
                          <button
                            className="text-link"
                            onClick={() =>
                              start("review", String(r.materialId), r.id)
                            }
                          >
                            Cancel remaining
                          </button>
                        )}
                    </div>
                  </article>
                );
              })}
            </>
          )}
          {tab === "history" && (
            <>
              <p className="field-hint">
                Deliveries add stock. Usage, wastage and returns subtract it.
                Corrections require an owner reason. Earlier stock quantities
                are retained as the opening balance.
              </p>
              {!moves.length && <p>No movements recorded yet.</p>}
              {[...moves].reverse().map((r) => (
                <article className="team-record" key={r.id}>
                  <div className="spread">
                    <strong>{matName(r.materialId)}</strong>
                    <span>
                      {Number(r.delta) > 0 ? "+" : ""}
                      {r.delta}{" "}
                      {catalog.find((m) => m.id === r.materialId)?.unit}
                    </span>
                  </div>
                  <p>
                    {r.kind} · {r.date} · {r.person}
                  </p>
                  <p>{r.note}</p>
                  {r.fileId && (
                    <a
                      href={"/api/files/" + r.fileId}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Delivery note / photo
                    </a>
                  )}
                </article>
              ))}
            </>
          )}
        </>
      )}
    </section>
  );
}
