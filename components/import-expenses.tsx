"use client";
import { useState, useRef } from "react";
import { FileUp, Plus, Check } from "lucide-react";
import { day, validateRow, type Row } from "@/lib/model";
import {
  duplicateEntry,
  parseDocumentText,
  parseStatementCSV,
  type Draft,
} from "@/lib/imports";
import { readDocument } from "@/lib/read-document";
export default function ImportExpenses({
  existing,
  onSave,
}: {
  existing: Row[];
  onSave: (rows: Row[]) => Promise<void>;
}) {
  const [mode, setMode] = useState<"bill" | "statement">("bill");
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [source, setSource] = useState("");
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  const [progress, setProgress] = useState("");
  const [busy, setBusy] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const lock = useRef(false);
  function patch(id: string, values: Record<string, string | number>) {
    setConfirmed(false);
    setDrafts((rows) =>
      rows.map((r) => (r.id === id ? { ...r, ...values } : r)),
    );
  }
  async function read(file: File) {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError("");
    setDrafts([]);
    setConfirmed(false);
    setText("");
    setSource(file.name);
    try {
      const raw = await readDocument(file, setProgress);
      setText(raw);
      const rows = /\.csv$/i.test(file.name)
        ? parseStatementCSV(raw)
        : parseDocumentText(raw, mode);
      setDrafts(rows);
      if (!rows.length)
        setError(
          "No entries could be identified. Check the extracted text below, then add an entry manually. CSV statements need Date, Description and Debit/Credit or Amount columns.",
        );
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Could not read this file. Try an unlocked PDF or a clearer image.",
      );
    } finally {
      lock.current = false;
      setBusy(false);
      setProgress("");
    }
  }
  async function save() {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError("");
    try {
      const rows: Row[] = drafts
        .filter((r) => r.selected === "yes")
        .map(({ selected, ...r }) => ({
          ...r,
          note: `Imported from ${source}. ${r.note || ""}`,
        }));
      if (!rows.length) throw new Error("Select at least one entry.");
      for (const r of rows) {
        validateRow("transactions", r);
        if (!r.party || !r.date)
          throw new Error("Each entry needs a date and a name.");
      }
      if (
        rows.some((r, i) =>
          duplicateEntry(r, [...existing, ...rows.slice(0, i)]),
        )
      )
        throw new Error(
          "A selected entry looks like a duplicate. Unselect it or correct its details before saving.",
        );
      await onSave(rows);
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Could not save. Your review is still here.",
      );
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  const selected = drafts.filter((r) => r.selected === "yes").length;
  return (
    <div className="import-flow">
      <p>
        Read the file. Check the details. Save only what belongs to this home.
      </p>
      <div className="segmented">
        <button
          type="button"
          disabled={busy}
          className={mode === "bill" ? "active" : ""}
          onClick={() => setMode("bill")}
        >
          Bill / receipt
        </button>
        <button
          type="button"
          disabled={busy}
          className={mode === "statement" ? "active" : ""}
          onClick={() => setMode("statement")}
        >
          Bank statement
        </button>
      </div>
      <label className="upload-zone">
        <FileUp size={29} />
        <strong>Choose PDF, photo or CSV</strong>
        <small>15 MB max · 20 PDF pages · 5 scanned pages</small>
        <input
          disabled={busy}
          type="file"
          accept=".pdf,.csv,.jpg,.jpeg,.png,.webp"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void read(f);
            e.target.value = "";
          }}
        />
      </label>
      <p className="import-help">
        Files are read on this device. Scan recognition downloads an English
        language model; your document is not sent to an AI service. Only entries
        you approve are saved. Original files are not attached.
      </p>
      {progress && <p role="status">{progress}</p>}
      {error && (
        <p className="error-banner" role="alert">
          {error}
        </p>
      )}
      {source && !busy && (
        <>
          <div className="section-heading">
            <h3>
              Review {drafts.length} suggestion{drafts.length === 1 ? "" : "s"}
            </h3>
          </div>
          <p className="import-help">
            Nothing is selected automatically. Check dates, amounts and whether
            money came in or went out. Unclear amounts are left as 0. Missing
            dates default to today. A bill is not proof of payment: select it
            only if it has been paid.
          </p>
          {drafts.map((r, i) => (
            <fieldset className="import-entry" key={r.id}>
              <legend>Entry {i + 1}</legend>
              <label className="review-checkbox">
                <input
                  type="checkbox"
                  checked={r.selected === "yes"}
                  disabled={busy}
                  onChange={(e) =>
                    patch(r.id, { selected: e.target.checked ? "yes" : "no" })
                  }
                />{" "}
                Include this entry
              </label>
              {duplicateEntry(r, existing) && (
                <p className="import-help">
                  Looks like an existing entry. Leave it unselected unless you
                  correct it.
                </p>
              )}
              <label>
                Money movement
                <select
                  disabled={busy}
                  value={r.kind}
                  onChange={(e) =>
                    patch(r.id, {
                      kind: e.target.value,
                      category:
                        e.target.value === "Contribution" ? "Funding" : "Other",
                      from:
                        e.target.value === "Contribution" ? "" : "House fund",
                      to: e.target.value === "Contribution" ? "House fund" : "",
                    })
                  }
                >
                  <option value="Expense">Money out · expense</option>
                  <option value="Contribution">Money in · funds added</option>
                  <option value="Transfer">
                    Between my accounts · transfer
                  </option>
                </select>
              </label>
              <div className="import-pair">
                <label>
                  Amount
                  <input
                    disabled={busy}
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={r.amount}
                    onChange={(e) =>
                      patch(r.id, { amount: Number(e.target.value) })
                    }
                  />
                </label>
                <label>
                  Date
                  <input
                    disabled={busy}
                    type="date"
                    value={r.date}
                    onChange={(e) => patch(r.id, { date: e.target.value })}
                  />
                </label>
              </div>
              <label>
                Paid to / received from
                <input
                  disabled={busy}
                  value={r.party}
                  onChange={(e) => patch(r.id, { party: e.target.value })}
                />
              </label>
              <label>
                Category
                <select
                  disabled={busy}
                  value={r.category}
                  onChange={(e) => patch(r.id, { category: e.target.value })}
                >
                  {[
                    "Materials",
                    "Labour",
                    "Contractor",
                    "Design",
                    "Permits",
                    "Equipment",
                    "Funding",
                    "Transfer",
                    "Other",
                  ].map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </label>
              {r.kind !== "Contribution" && (
                <label>
                  From account
                  <input
                    disabled={busy}
                    value={r.from}
                    onChange={(e) => patch(r.id, { from: e.target.value })}
                  />
                </label>
              )}
              {r.kind !== "Expense" && (
                <label>
                  To account
                  <input
                    disabled={busy}
                    value={r.to}
                    onChange={(e) => patch(r.id, { to: e.target.value })}
                  />
                </label>
              )}
              <details>
                <summary>Source description / note</summary>
                <textarea
                  disabled={busy}
                  value={r.note}
                  onChange={(e) => patch(r.id, { note: e.target.value })}
                />
              </details>
            </fieldset>
          ))}
          <button
            className="button"
            disabled={busy || drafts.length >= 300}
            onClick={() =>
              setDrafts((r) => [
                ...r,
                {
                  id: crypto.randomUUID(),
                  selected: "no",
                  kind: "Expense",
                  amount: 0,
                  date: day(),
                  party: "",
                  category: "Other",
                  from: "House fund",
                  to: "",
                  note: "",
                },
              ])
            }
          >
            <Plus size={17} /> Add an entry
          </button>
          {text && (
            <details className="extracted-text">
              <summary>See extracted text</summary>
              <pre>{text}</pre>
            </details>
          )}
          <label className="review-checkbox">
            <input
              type="checkbox"
              checked={confirmed}
              disabled={busy}
              onChange={(e) => setConfirmed(e.target.checked)}
            />{" "}
            I checked the selected entries against my file.
          </label>
          <button
            className="button primary"
            disabled={!selected || !confirmed || busy}
            onClick={() => void save()}
          >
            <Check size={18} />
            {busy
              ? "Saving…"
              : `Save ${selected} selected ${selected === 1 ? "entry" : "entries"}`}
          </button>
        </>
      )}
    </div>
  );
}
