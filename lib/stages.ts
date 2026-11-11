import { type Project, type Row, type Section } from "./model";
export const linkedSections: Section[] = [
  "transactions",
  "payments",
  "materials",
  "updates",
  "decisions",
  "documents",
  "people",
  "cameras",
];
export const starterStageNames = [
  "Preconstruction",
  "Foundation",
  "Ground floor",
  "1st floor",
  "2nd floor",
  "Finishing",
];
export function stageName(project: Project, id: unknown) {
  return project.stages.find((s) => s.id === id)?.title || "Whole project";
}
export function stageSummary(project: Project, id: string) {
  const transactions = project.transactions.filter(
    (r) => (r.stageId || "") === id,
  );
  const sum = (rows: Row[]) =>
    rows.reduce((n, r) => n + Number(r.amount || 0), 0);
  const spent = sum(transactions.filter((r) => r.kind === "Expense"));
  const funds = sum(transactions.filter((r) => r.kind === "Contribution"));
  const due = sum(
    project.payments.filter(
      (r) =>
        (r.stageId || "") === id &&
        ["Pending", "Approved"].includes(String(r.status)),
    ),
  );
  const budget = Number(project.stages.find((r) => r.id === id)?.budget || 0);
  return { spent, funds, due, budget };
}
export function stageLinkCount(project: Project, id: string) {
  return (
    (project.attendance || []).filter((r) => r.stageId === id).length +
    linkedSections.reduce(
      (n, s) => n + project[s].filter((r) => r.stageId === id).length,
      0,
    )
  );
}
export function removeStage(project: Project, id: string): Project {
  const title = String(stageName(project, id));
  const next = {
    ...project,
    stages: project.stages.filter((r) => r.id !== id),
  };
  for (const section of linkedSections)
    next[section] = project[section].map((r) =>
      r.stageId === id ? { ...r, stageId: "", previousStageTitle: title } : r,
    );
  next.attendance = (project.attendance || []).map((r) =>
    r.stageId === id ? { ...r, stageId: "", previousStageTitle: title } : r,
  );
  for (const section of ["materialRequests", "materialMovements"] as const)
    next[section] = (project[section] || []).map((r) =>
      r.stageId === id ? { ...r, stageId: "", previousStageTitle: title } : r,
    );
  return next;
}
