import { z } from "zod";
import { canSubmit } from "./access";
import { day, type Project, type Row } from "./model";
const date = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine(
    (v) =>
      !isNaN(Date.parse(v)) && new Date(v).toISOString().slice(0, 10) === v,
    "Choose a valid date",
  );
export const actionSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("request"),
    id: z.string().uuid(),
    requestType: z.enum(["Payment", "Reimbursement"]),
    title: z.string().trim().min(1).max(150),
    amount: z.number().positive().max(1e9),
    due: date,
    spentDate: z.union([date, z.literal("")]).default(""),
    category: z.enum([
      "Materials",
      "Labour",
      "Contractor",
      "Design",
      "Permits",
      "Equipment",
      "Other",
    ]),
    note: z.string().trim().max(3000).default(""),
    stageId: z.string().max(100).default(""),
    fileId: z.union([z.string().uuid(), z.literal("")]).default(""),
    fileName: z.string().max(200).default(""),
  }),
  z.object({
    action: z.literal("daily"),
    noteType: z
      .enum(["Site note", "Blocker", "Material request"])
      .default("Site note"),
    id: z.string().uuid(),
    title: z.string().trim().min(1).max(150),
    note: z.string().trim().min(1).max(3000),
    stageId: z.string().max(100).default(""),
  }),
  z.object({
    action: z.literal("checkin"),
    id: z.string().uuid(),
    status: z.enum(["On site", "Remote work"]),
    note: z.string().trim().max(1000).default(""),
    stageId: z.string().max(100).default(""),
  }),
  z.object({ action: z.literal("checkout") }),
]);
export function applyTeamAction(
  p: Project,
  role: string,
  user: { id: string; name: string },
  input: unknown,
  now = new Date().toISOString(),
): Project {
  if (!canSubmit(role))
    throw new Error("Your role cannot submit requests or attendance.");
  const a = actionSchema.parse(input);
  if ("stageId" in a && a.stageId && !p.stages.some((s) => s.id === a.stageId))
    throw new Error("Choose an existing stage.");
  if (
    "id" in a &&
    [...p.payments, ...p.updates, ...(p.attendance || [])].some(
      (r) => r.id === a.id,
    )
  )
    throw new Error("This submission was already saved. Refresh to see it.");
  if (a.action === "request") {
    if (
      a.requestType === "Reimbursement" &&
      (!a.spentDate || a.spentDate > day())
    )
      throw new Error("Choose when you paid, up to today.");
    const row: Row = {
      ...a,
      party: user.name,
      submittedBy: user.id,
      submittedAt: now,
      status: "Pending",
      account: "House fund",
    };
    return { ...p, payments: [row, ...p.payments] };
  }
  if (a.action === "daily")
    return {
      ...p,
      updates: [
        {
          id: a.id,
          title:
            a.noteType === "Site note" ? a.title : a.noteType + ": " + a.title,
          note: a.note,
          stageId: a.stageId,
          date: day(),
          author: user.name,
          workers: 0,
          submittedBy: user.id,
          submittedAt: now,
          shared: "no",
        },
        ...p.updates,
      ],
    };
  const attendance = p.attendance || [];
  const today = attendance.find(
    (r) => r.userId === user.id && r.date === day(),
  );
  if (a.action === "checkout") {
    if (!today || today.checkOutAt)
      throw new Error(
        "Check in first. A completed visit cannot be checked out twice.",
      );
    return {
      ...p,
      attendance: attendance.map((r) =>
        r.id === today.id ? { ...r, checkOutAt: now } : r,
      ),
    };
  }
  if (today)
    throw new Error(
      "You already recorded today’s attendance. Ask the owner to correct it if needed.",
    );
  return {
    ...p,
    attendance: [
      {
        id: a.id,
        userId: user.id,
        person: user.name,
        role,
        date: day(),
        status: a.status,
        note: a.note,
        stageId: a.stageId,
        checkInAt: now,
        confirmed: "no",
        source: "self-reported",
      },
      ...attendance,
    ],
  };
}
