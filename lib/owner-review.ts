import type { Project } from "./model";
function validateReviews(
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

// Keep removals outside active totals while retaining immutable server-stamped records.
export function stampReviews(
  previous: Project,
  proposed: Project,
  ownerId: string,
  now = new Date().toISOString(),
  removalReason = "",
): Project {
  const removedPayments = new Set(
    previous.payments
      .filter((r) => !proposed.payments.some((n) => n.id === r.id))
      .map((r) => r.id),
  );
  for (const t of previous.transactions) {
    if (t.paymentId && !proposed.transactions.some((n) => n.id === t.id))
      removedPayments.add(String(t.paymentId));
  }
  const next = {
    ...proposed,
    payments: proposed.payments.filter((r) => !removedPayments.has(r.id)),
    transactions: proposed.transactions.filter(
      (r) => !removedPayments.has(String(r.paymentId || "")),
    ),
  };
  const removedTransactions = previous.transactions.filter(
    (r) => !next.transactions.some((n) => n.id === r.id),
  );
  if (
    (removedPayments.size || removedTransactions.length) &&
    !removalReason.trim()
  )
    throw new Error("Add a reason for removing this financial entry.");
  const archivedIds = new Set(
    [
      ...(previous.archivedPayments || []),
      ...(previous.archivedTransactions || []),
    ].map((r) => r.id),
  );
  if (
    [...next.payments, ...next.transactions].some((r) => archivedIds.has(r.id))
  )
    throw new Error(
      "A removed entry cannot be overwritten. Create a new entry instead.",
    );
  const checked = validateReviews(
    {
      ...previous,
      payments: previous.payments.filter((r) => !removedPayments.has(r.id)),
      transactions: previous.transactions.filter(
        (r) => !removedTransactions.some((t) => t.id === r.id),
      ),
    },
    next,
    ownerId,
    now,
  );
  // Clients cannot supply or rewrite the archive or event history.
  const archive = (r: Project["payments"][number]) => ({
    ...r,
    deletedAt: now,
    deletedBy: ownerId,
    deletionReason: removalReason.trim(),
  });
  const history = [...(previous.history || [])];
  for (const section of ["payments", "transactions", "attendance"] as const) {
    const oldRows = previous[section] || [],
      newRows = checked[section] || [];
    for (const id of new Set([...oldRows, ...newRows].map((r) => r.id))) {
      const old = oldRows.find((r) => r.id === id),
        current = newRows.find((r) => r.id === id);
      if (JSON.stringify(old) === JSON.stringify(current)) continue;
      history.push({
        id: crypto.randomUUID(),
        section,
        recordId: id,
        at: now,
        actor: ownerId,
        action: !current
          ? "Removed"
          : !old
            ? "Created"
            : current.status !== old.status
              ? String(current.status)
              : "Updated",
        title: String(
          current?.title ||
            old?.title ||
            current?.party ||
            old?.party ||
            current?.person ||
            old?.person ||
            "Entry",
        ),
        reason: !current ? removalReason.trim() : "",
        before: JSON.stringify(old || null),
        after: JSON.stringify(current || null),
      });
    }
  }
  return {
    ...checked,
    history,
    archivedPayments: [
      ...(previous.archivedPayments || []),
      ...previous.payments
        .filter((r) => removedPayments.has(r.id))
        .map(archive),
    ],
    archivedTransactions: [
      ...(previous.archivedTransactions || []),
      ...removedTransactions.map(archive),
    ],
  };
}
