import { emptyProject, type Project, type Row } from "./model";
export const teamRoles = [
  "contractor",
  "architect",
  "family",
  "friend",
] as const;
export type TeamRole = (typeof teamRoles)[number];
export function canSubmit(role: string) {
  return role === "contractor" || role === "architect";
}
const pick = (row: Row, keys: string[]): Row =>
  Object.fromEntries(
    ["id", ...keys].filter((k) => row[k] !== undefined).map((k) => [k, row[k]]),
  ) as Row;
export function visibleProject(
  p: Project,
  role: string,
  userId: string,
): Project {
  if (role === "owner") return p;
  return {
    ...emptyProject(),
    name: p.name,
    currency: p.currency,
    target: role === "contractor" ? "" : p.target,
    transactions:
      role === "architect"
        ? p.transactions
            .filter((r) => r.kind === "Expense")
            .map((r) =>
              pick(r, [
                "kind",
                "amount",
                "date",
                "party",
                "category",
                "stageId",
              ]),
            )
        : [],
    stages: p.stages.map((s) =>
      pick(s, role === "contractor" ? ["title"] : ["title", "progress", "due"]),
    ),
    updates: p.updates
      .filter(
        (r) =>
          (role !== "contractor" && r.shared === "yes") ||
          (canSubmit(role) && r.submittedBy === userId),
      )
      .map((r) =>
        pick(r, [
          "title",
          "date",
          "author",
          "note",
          "stageId",
          "fileId",
          "fileName",
          "shared",
        ]),
      ),
    payments: canSubmit(role)
      ? [
          ...p.payments,
          ...(p.archivedPayments || []).map((r): Row => ({
            ...r,
            status: "Removed",
          })),
        ]
          .filter((r) => r.submittedBy === userId)
          .map((r) =>
            pick(r, [
              "title",
              "party",
              "amount",
              "due",
              "category",
              "note",
              "stageId",
              "status",
              "requestType",
              "spentDate",
              "fileId",
              "fileName",
              "submittedAt",
              "reviewNote",
              "reviewedAt",
              "paidAt",
              "paidDate",
              "paymentReference",
              "submittedBy",
              "deletedAt",
              "deletionReason",
            ]),
          )
      : [],
    attendance: canSubmit(role)
      ? (p.attendance || [])
          .filter((r) => r.userId === userId)
          .map((r) =>
            pick(r, [
              "userId",
              "person",
              "role",
              "date",
              "status",
              "note",
              "stageId",
              "checkInAt",
              "checkOutAt",
              "confirmed",
            ]),
          )
      : [],
  };
}
export function canReadFile(
  p: Project,
  role: string,
  userId: string,
  fileId: string,
  uploaderId?: string | null,
) {
  if (role === "owner") return true;
  if (canSubmit(role) && uploaderId === userId) return true;
  const visible = visibleProject(p, role, userId);
  return [...visible.payments, ...visible.updates].some(
    (r) => r.fileId === fileId,
  );
}
