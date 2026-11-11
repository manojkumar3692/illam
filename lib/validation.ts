import { z } from "zod";
import { validateRow, type Section } from "./model";
const row = z
  .record(z.string(), z.union([z.string().max(12000), z.number().finite()]))
  .and(z.object({ id: z.string().min(1).max(100) }));
export const projectSchema = z
  .object({
    name: z.string().trim().min(1).max(100),
    location: z.string().max(200),
    currency: z.enum(["INR", "AED", "USD", "GBP", "EUR"]),
    budget: z.number().finite().min(0).max(1e12),
    reserve: z.number().finite().min(0).max(1e12),
    target: z.string().max(10),
    transactions: z.array(row).max(10000),
    payments: z.array(row).max(5000),
    stages: z.array(row).max(200),
    materials: z.array(row).max(5000),
    people: z.array(row).max(500),
    updates: z.array(row).max(5000),
    decisions: z.array(row).max(5000),
    documents: z.array(row).max(5000),
    cameras: z.array(row).max(50),
    materialRequests: z.array(row).max(10000).default([]),
    materialMovements: z.array(row).max(30000).default([]),
    materialSuggestions: z.array(row).max(5000).default([]),
    attendance: z.array(row).max(10000).default([]),
    archivedPayments: z.array(row).max(10000).default([]),
    archivedTransactions: z.array(row).max(10000).default([]),
    history: z
      .array(
        z
          .record(
            z.string(),
            z.union([z.string().max(50000), z.number().finite()]),
          )
          .and(z.object({ id: z.string() })),
      )
      .max(50000)
      .default([]),
  })
  .superRefine((p, ctx) => {
    const visits = new Set<string>();
    for (const a of p.attendance) {
      const key = String(a.userId) + ":" + String(a.date);
      if (
        !a.userId ||
        !/^\d{4}-\d{2}-\d{2}$/.test(String(a.date)) ||
        !["On site", "Remote work", "Half day", "Absent"].includes(
          String(a.status),
        ) ||
        visits.has(key)
      )
        ctx.addIssue({
          code: "custom",
          message: "Attendance needs one valid record per person and day.",
        });
      visits.add(key);
      if (a.stageId && !p.stages.some((s) => s.id === a.stageId))
        ctx.addIssue({
          code: "custom",
          message: "Choose an existing attendance stage.",
        });
    }
    for (const section of [
      "transactions",
      "payments",
      "stages",
      "materials",
      "people",
      "updates",
      "decisions",
      "documents",
      "cameras",
    ] as Section[]) {
      const ids = new Set<string>();
      for (const r of p[section]) {
        if (ids.has(r.id))
          ctx.addIssue({ code: "custom", message: "Duplicate entry ID" });
        ids.add(r.id);
        if (
          section !== "stages" &&
          r.stageId &&
          !p.stages.some((stage) => stage.id === r.stageId)
        )
          ctx.addIssue({
            code: "custom",
            message: "Choose an existing construction stage.",
          });
        if (section === "stages" && !String(r.title || "").trim())
          ctx.addIssue({ code: "custom", message: "Enter a stage name." });
        try {
          validateRow(section, r);
        } catch (e) {
          ctx.addIssue({ code: "custom", message: (e as Error).message });
        }
        if (
          section === "transactions" &&
          !["Contribution", "Expense", "Transfer"].includes(String(r.kind))
        )
          ctx.addIssue({
            code: "custom",
            message: "Invalid ledger entry type",
          });
        if (
          (section === "payments" || section === "decisions") &&
          !["Pending", "Approved", "Paid", "Rejected"].includes(
            String(r.status),
          )
        )
          ctx.addIssue({ code: "custom", message: "Invalid approval status" });
        for (const key of [
          "received",
          "used",
          "reorder",
          "remaining",
          "budget",
          "workers",
        ])
          if (key in r && (typeof r[key] !== "number" || Number(r[key]) < 0))
            ctx.addIssue({
              code: "custom",
              message: "Quantities must be non-negative numbers",
            });
      }
    }
  });
