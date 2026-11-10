"use client";
import { useState } from "react";
import { day, type Row } from "@/lib/model";
export default function QuickMoneyForm({
  row,
  defaults,
  currency,
  accounts,
}: {
  row?: Row;
  defaults?: Partial<Row>;
  currency: string;
  accounts: string[];
}) {
  const [kind, setKind] = useState(
    String(row?.kind || defaults?.kind || "Expense"),
  );
  const accountOptions = Array.from(new Set(["House fund", ...accounts]));
  return (
    <div className="quick-money-form">
      <div className="entry-kind" role="group" aria-label="Entry type">
        {["Expense", "Contribution", "Transfer"].map((k) => (
          <button
            type="button"
            key={k}
            className={kind === k ? "selected" : ""}
            aria-pressed={kind === k}
            onClick={() => setKind(k)}
          >
            {k === "Contribution" ? "Money in" : k}
          </button>
        ))}
      </div>
      <input type="hidden" name="kind" value={kind} />
      <label className="amount-input">
        Amount <span>{currency}</span>
        <input
          name="amount"
          type="number"
          inputMode="decimal"
          min="0.01"
          step="0.01"
          placeholder="0"
          defaultValue={row?.amount}
          required
          autoComplete="off"
        />
      </label>
      <label>
        {kind === "Expense"
          ? "Who did you pay?"
          : kind === "Contribution"
            ? "Who added the money?"
            : "Who is receiving it?"}
        <input
          name="party"
          required
          defaultValue={row?.party}
          placeholder={kind === "Expense" ? "e.g. Cement supplier" : "Name"}
          maxLength={500}
        />
      </label>
      {kind === "Expense" ? (
        <label>
          What was it for?
          <select name="category" defaultValue={row?.category || "Materials"}>
            {[
              "Materials",
              "Labour",
              "Contractor",
              "Design",
              "Permits",
              "Equipment",
              "Other",
            ].map((v) => (
              <option key={v}>{v}</option>
            ))}
          </select>
        </label>
      ) : (
        <input
          name="category"
          type="hidden"
          value={kind === "Contribution" ? "Funding" : "Transfer"}
        />
      )}
      {kind === "Transfer" && (
        <div className="form-two">
          <label>
            From account
            <input
              name="from"
              list="money-accounts"
              required
              defaultValue={row?.from || "House fund"}
            />
          </label>
          <label>
            To account
            <input
              name="to"
              list="money-accounts"
              required
              defaultValue={row?.to}
              placeholder="e.g. Site supervisor"
            />
          </label>
        </div>
      )}
      <details className="entry-extra">
        <summary>Date, account & note</summary>
        <label>
          Date
          <input
            type="date"
            name="date"
            required
            defaultValue={row?.date || day()}
          />
        </label>
        {kind !== "Transfer" && (
          <>
            <label>
              {kind === "Expense" ? "Paid from" : "Added to"}
              <input
                name={kind === "Expense" ? "from" : "to"}
                list="money-accounts"
                required
                defaultValue={
                  kind === "Expense"
                    ? row?.from || "House fund"
                    : row?.to || "House fund"
                }
              />
            </label>
            <input
              type="hidden"
              name={kind === "Expense" ? "to" : "from"}
              value=""
            />
          </>
        )}
        <label>
          Note (optional)
          <textarea
            name="note"
            rows={2}
            defaultValue={row?.note}
            placeholder="Bill number or a short note"
            maxLength={3000}
          />
        </label>
      </details>
      <datalist id="money-accounts">
        {accountOptions.map((a) => (
          <option key={a} value={a} />
        ))}
      </datalist>
    </div>
  );
}
