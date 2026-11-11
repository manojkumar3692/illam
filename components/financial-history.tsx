import { money, type Project, type Row } from "@/lib/model";
const fields: Record<string, string> = {
  title: "Description",
  party: "Person",
  kind: "Entry type",
  amount: "Amount",
  date: "Date",
  due: "Due",
  status: "Status",
  from: "Paid from",
  to: "Received into",
  category: "Category",
  note: "Note",
  requestType: "Request type",
  spentDate: "Paid personally on",
  paymentReference: "Payment reference",
  reviewNote: "Review note",
  person: "Person",
  confirmed: "Confirmed",
  checkInAt: "Check-in",
  checkOutAt: "Check-out",
};
function RecordDetails({ value }: { value: string | number | undefined }) {
  let r: Record<string, unknown> | null = null;
  try {
    r = JSON.parse(String(value || "null"));
  } catch {
    return null;
  }
  return r ? (
    <dl className="history-fields">
      {Object.entries(fields)
        .filter(([k]) => r?.[k] !== undefined && r?.[k] !== "")
        .map(([k, label]) => (
          <div key={k}>
            <dt>{label}</dt>
            <dd>{String(r?.[k])}</dd>
          </div>
        ))}
    </dl>
  ) : (
    <p className="field-hint">No active entry</p>
  );
}
const date = (v: string | number) =>
  new Date(String(v)).toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    dateStyle: "medium",
    timeStyle: "short",
  }) + " IST";
export default function FinancialHistory({ project }: { project: Project }) {
  const removed: Row[] = [
    ...(project.archivedPayments || []).map((r) => ({
      ...r,
      entryType: "Request",
    })),
    ...(project.archivedTransactions || []).map((r) => ({
      ...r,
      entryType: "Ledger entry",
    })),
  ];
  return (
    <section className="financial-history">
      <details>
        <summary>History & removed entries ({removed.length} removed)</summary>
        <p className="field-hint">
          Removed entries stay here and are excluded from balances and payments
          due. A recorded reversal does not move money at your bank. Detailed
          change history starts from this update.
        </p>
        {removed.map((r) => (
          <article className="team-record" key={String(r.entryType) + r.id}>
            <span className="badge">Removed · {r.entryType}</span>
            <h3>{r.title || r.party || r.kind}</h3>
            <strong>{money(Number(r.amount), project.currency)}</strong>
            <p>{r.deletionReason}</p>
            <small>{date(r.deletedAt)} · removed by owner</small>
            {r.fileId && (
              <a
                href={"/api/files/" + r.fileId}
                target="_blank"
                rel="noreferrer"
              >
                Original bill
              </a>
            )}
            <details>
              <summary>Original record</summary>
              <RecordDetails value={JSON.stringify(r)} />
            </details>
          </article>
        ))}
        <h3>Activity log</h3>
        {!(project.history || []).length && <p>No recorded changes yet.</p>}
        {[...(project.history || [])].reverse().map((r) => (
          <article className="team-record" key={r.id}>
            <strong>
              {r.action} · {r.title}
            </strong>
            <small>
              {date(r.at)} ·{" "}
              {r.action === "Submitted" ? "Team submission" : "Owner change"}
            </small>
            {r.reason && <p>{r.reason}</p>}
            <details>
              <summary>View recorded change</summary>
              <h4>Before</h4>
              <RecordDetails value={r.before} />
              <h4>After</h4>
              <RecordDetails value={r.after} />
              <small>Recorded by account {r.actor}</small>
            </details>
          </article>
        ))}
      </details>
    </section>
  );
}
