import type { Project } from "./model";
export function stampReviews(
  previous: Project,
  next: Project,
  ownerId: string,
  now = new Date().toISOString(),
): Project {
  const protectedFields = (r: Record<string, string | number>) =>
    JSON.stringify(
      Object.fromEntries(
        Object.entries(r)
          .filter(([key]) => !["stageId", "previousStageTitle"].includes(key))
          .sort(([a], [b]) => a.localeCompare(b)),
      ),
    );
  const linked = new Set<string>();
  for (const t of next.transactions) {
    if (t.paymentId) {
      if (linked.has(String(t.paymentId)))
        throw new Error("This payment already has an expense.");
      linked.add(String(t.paymentId));
    }
  }
  const payments = next.payments.map((r) => {
    const old = previous.payments.find((x) => x.id === r.id);
    if (!old) return r;
    if (old.submittedBy) {
      for (const key of [
        "submittedBy",
        "submittedAt",
        "amount",
        "title",
        "party",
        "requestType",
        "spentDate",
        "fileId",
        "fileName",
        "note",
        "due",
        "category",
      ])
        if ((old[key] || "") !== (r[key] || ""))
          throw new Error(
            "Keep the original claim unchanged. Reject it and ask for a corrected request.",
          );
    }
    if (old.status === "Paid" && protectedFields(old) !== protectedFields(r))
      throw new Error("A paid request cannot be edited.");
    if (old.status === r.status) return r;
    if (r.status === "Paid") {
      if (old.status !== "Approved")
        throw new Error("Approve the request before marking it paid.");
      const expense = next.transactions.find((t) => t.paymentId === r.id);
      if (
        !expense ||
        expense.kind !== "Expense" ||
        Number(expense.amount) !== Number(r.amount)
      )
        throw new Error(
          "Marking paid must record exactly one matching expense.",
        );
      return { ...r, paidAt: now, paidBy: ownerId };
    }
    if (r.status === "Rejected" && !String(r.reviewNote || "").trim())
      throw new Error("Add a reason when declining a request.");
    if (
      !["Approved", "Rejected"].includes(String(r.status)) ||
      old.status !== "Pending"
    )
      throw new Error("This request cannot change to that status.");
    return { ...r, reviewedAt: now, reviewedBy: ownerId };
  });
  for (const old of previous.payments.filter(
    (p) => p.submittedBy || p.status === "Paid",
  ))
    if (!payments.some((p) => p.id === old.id))
      throw new Error(
        "Keep submitted requests for the audit trail. Reject them instead of deleting.",
      );
  for (const old of previous.transactions.filter((t) => t.paymentId)) {
    const current = next.transactions.find((t) => t.id === old.id);
    if (!current || protectedFields(current) !== protectedFields(old))
      throw new Error("A settled payment expense cannot be removed or edited.");
  }
  return { ...next, payments };
}
