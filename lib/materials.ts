import { z } from "zod";
import { day, type Project, type Row } from "./model";
export const materialUnits = [
  "bags",
  "pieces",
  "tonnes",
  "kg",
  "cubic feet",
  "cubic metres",
  "loads",
] as const;
export const materialPresets = [
  { title: "Cement", spec: "", unit: "bags" },
  { title: "Bricks", spec: "", unit: "pieces" },
  { title: "M-sand", spec: "", unit: "cubic feet" },
  { title: "P-sand", spec: "", unit: "cubic feet" },
  { title: "Jally", spec: "20 mm", unit: "cubic feet" },
  { title: "Jally", spec: "40 mm", unit: "cubic feet" },
  { title: "Steel", spec: "", unit: "kg" },
];
export function materialKey(title: string, spec = "") {
  let name = title.toLowerCase().replace(/[^a-z0-9]/g, "");
  const aliases: Record<string, string> = {
    jalli: "aggregate",
    jally: "aggregate",
    jelly: "aggregate",
    aggregate: "aggregate",
    aggregates: "aggregate",
    brick: "bricks",
    msand: "msand",
    manufacturedsand: "msand",
    psand: "psand",
    plasteringsand: "psand",
    cements: "cement",
  };
  name = aliases[name] || name;
  return name + "|" + spec.toLowerCase().replace(/[^a-z0-9]/g, "");
}
export const activeMaterials = (p: Project) =>
  p.materials.filter((m) => !m.mergedInto);
export function materialStock(p: Project, id: string) {
  const m = p.materials.find((r) => r.id === id);
  if (!m) return 0;
  return (
    Math.round(
      (Number(m.received || 0) -
        Number(m.used || 0) +
        (p.materialMovements || [])
          .filter((r) => r.materialId === id)
          .reduce((s, r) => s + Number(r.delta), 0)) *
        1000,
    ) / 1000
  );
}
export const requestReceived = (p: Project, id: string) =>
  (p.materialMovements || [])
    .filter((r) => r.requestId === id && r.kind === "Delivery")
    .reduce((s, r) => s + Number(r.quantity), 0);
export function materialStatus(p: Project, r: Row) {
  if (["Cancelled", "Rejected"].includes(String(r.status)))
    return String(r.status);
  const got = requestReceived(p, r.id);
  return got >= Number(r.quantity)
    ? "Received"
    : got > 0
      ? "Part received"
      : String(r.status);
}
export function materialAlerts(p: Project) {
  return activeMaterials(p).map((m) => {
    const stock = materialStock(p, m.id),
      last =
        (p.materialMovements || [])
          .filter((r) => r.materialId === m.id)
          .map((r) => String(r.date))
          .sort()
          .at(-1) || String(m.stockCheckedOn || "");
    return {
      id: m.id,
      title: String(m.title),
      stock,
      unit: String(m.unit),
      low: stock <= Number(m.reorder || 0),
      stale:
        !last ||
        last <
          new Date(new Date(day() + "T12:00:00Z").getTime() - 7 * 86400000)
            .toISOString()
            .slice(0, 10),
    };
  });
}
const id = z.string().min(1).max(100),
  text = z.string().trim().max(1000).default("");
const date = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine(
    (v) =>
      !isNaN(Date.parse(v)) && new Date(v).toISOString().slice(0, 10) === v,
  );
const positive = z.number().finite().positive().max(1e9);
export const materialActionSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("create"),
    id,
    title: z.string().trim().min(1).max(100),
    spec: z.string().trim().max(100).default(""),
    unit: z.enum(materialUnits),
    reorder: z.number().min(0).max(1e9),
    suggestionId: z.string().default(""),
  }),
  z.object({
    action: z.literal("threshold"),
    materialId: id,
    reorder: z.number().min(0).max(1e9),
  }),
  z.object({
    action: z.literal("suggest"),
    id,
    title: z.string().trim().min(1).max(100),
    spec: z.string().trim().max(100).default(""),
    unit: z.enum(materialUnits),
    note: text,
  }),
  z.object({
    action: z.literal("request"),
    id,
    materialId: id,
    quantity: positive,
    stageId: z.string().max(100).default(""),
    neededBy: date,
    note: text,
    duplicateReason: text,
    fileId: z.string().max(100).default(""),
    fileName: z.string().max(200).default(""),
  }),
  z.object({
    action: z.literal("review"),
    requestId: id,
    status: z.enum(["Approved", "Rejected", "Cancelled"]),
    note: text,
  }),
  z.object({
    action: z.literal("order"),
    requestId: id,
    supplier: z.string().trim().min(1).max(150),
    expectedDate: date,
    expenseId: z.string().max(100).default(""),
  }),
  z.object({ action: z.literal("linkExpense"), requestId: id, expenseId: id }),
  z.object({
    action: z.literal("movement"),
    id,
    materialId: id,
    kind: z.enum(["Delivery", "Usage", "Wastage", "Return", "Correction"]),
    quantity: z
      .number()
      .finite()
      .min(-1e9)
      .max(1e9)
      .refine((v) => v !== 0),
    date,
    stageId: z.string().max(100).default(""),
    requestId: z.string().max(100).default(""),
    note: text,
    fileId: z.string().max(100).default(""),
    fileName: z.string().max(200).default(""),
  }),
  z.object({
    action: z.literal("merge"),
    sourceId: id,
    targetId: id,
    note: z.string().trim().min(1).max(1000),
  }),
]);
export function applyMaterialAction(
  previous: Project,
  role: string,
  user: { id: string; name: string },
  input: unknown,
  now = new Date().toISOString(),
): Project {
  if (!["owner", "architect", "contractor"].includes(role))
    throw new Error("You cannot manage site materials.");
  const a = materialActionSchema.parse(input),
    p = structuredClone(previous);
  p.materialRequests ||= [];
  p.materialMovements ||= [];
  p.materialSuggestions ||= [];
  const owner = role === "owner";
  if (
    ["create", "threshold", "review", "order", "merge", "linkExpense"].includes(
      a.action,
    ) &&
    !owner
  )
    throw new Error(
      "Only the owner can approve or change the material register.",
    );
  if (
    "id" in a &&
    [
      ...p.materials,
      ...p.materialRequests,
      ...p.materialMovements,
      ...p.materialSuggestions,
    ].some((r) => r.id === a.id)
  )
    throw new Error("Already saved. Refresh before trying again.");
  if ("stageId" in a && a.stageId && !p.stages.some((s) => s.id === a.stageId))
    throw new Error("Choose an existing stage.");
  const material = (mid: string) => {
    const m = p.materials.find((r) => r.id === mid && !r.mergedInto);
    if (!m) throw new Error("Choose an active material from the register.");
    return m;
  };
  const request = (rid: string) => {
    const r = p.materialRequests!.find((r) => r.id === rid);
    if (!r) throw new Error("Request not found.");
    return r;
  };
  const stamp = { by: user.id, person: user.name, at: now };
  if (a.action === "create") {
    if (
      activeMaterials(p).some(
        (m) =>
          materialKey(String(m.title), String(m.spec || "")) ===
          materialKey(a.title, a.spec),
      )
    )
      throw new Error(
        "This material and specification already exist. Use the existing entry and its unit.",
      );
    p.materials.push({
      id: a.id,
      title: a.title,
      spec: a.spec,
      unit: a.unit,
      reorder: a.reorder,
      received: 0,
      used: 0,
      ...stamp,
    });
    if (a.suggestionId) {
      const suggestion = p.materialSuggestions.find(
        (r) => r.id === a.suggestionId && r.status === "Pending",
      );
      if (!suggestion) throw new Error("Suggestion is no longer pending.");
      suggestion.status = "Added";
      suggestion.materialId = a.id;
    }
  } else if (a.action === "threshold") {
    material(a.materialId).reorder = a.reorder;
  } else if (a.action === "suggest") {
    const key = materialKey(a.title, a.spec);
    if (
      activeMaterials(p).some(
        (m) => materialKey(String(m.title), String(m.spec || "")) === key,
      ) ||
      p.materialSuggestions.some(
        (m) =>
          m.status === "Pending" &&
          materialKey(String(m.title), String(m.spec || "")) === key,
      )
    )
      throw new Error(
        "This material already exists or has a pending suggestion.",
      );
    p.materialSuggestions.push({ ...a, status: "Pending", ...stamp });
  } else if (a.action === "request") {
    material(a.materialId);
    const existing = p.materialRequests.filter(
      (r) =>
        r.materialId === a.materialId &&
        String(r.stageId || "") === a.stageId &&
        !["Received", "Rejected", "Cancelled"].includes(materialStatus(p, r)),
    );
    if (existing.length && !a.duplicateReason.trim())
      throw new Error(
        "An open request exists for this material and stage. View it, or give a reason for a separate request.",
      );
    p.materialRequests.push({ ...a, status: "Requested", ...stamp });
  } else if (a.action === "review") {
    const r = request(a.requestId),
      status = materialStatus(p, r);
    if (a.status === "Approved" && status !== "Requested")
      throw new Error("Only a new request can be approved.");
    if (a.status === "Rejected" && status !== "Requested")
      throw new Error("Only a new request can be rejected.");
    if (
      a.status === "Cancelled" &&
      ["Received", "Rejected", "Cancelled"].includes(status)
    )
      throw new Error("This request is already closed.");
    if (a.status !== "Approved" && !a.note.trim())
      throw new Error(
        "Give a reason. Received stock will remain in the register.",
      );
    Object.assign(r, {
      status: a.status,
      reviewNote: a.note,
      reviewedBy: user.id,
      reviewedAt: now,
    });
  } else if (a.action === "order") {
    const r = request(a.requestId);
    if (r.status !== "Approved")
      throw new Error("Approve this request before ordering.");
    if (
      a.expenseId &&
      (!p.transactions.some(
        (t) => t.id === a.expenseId && t.kind === "Expense",
      ) ||
        p.materialRequests.some(
          (t) => t.expenseId === a.expenseId && t.id !== r.id,
        ))
    )
      throw new Error(
        "Choose an existing expense that is not already linked to another material order.",
      );
    Object.assign(r, {
      status: "Ordered",
      supplier: a.supplier,
      expectedDate: a.expectedDate,
      expenseId: a.expenseId,
      orderedBy: user.id,
      orderedAt: now,
    });
  } else if (a.action === "linkExpense") {
    const r = request(a.requestId);
    if (
      !["Ordered", "Part received", "Received"].includes(materialStatus(p, r))
    )
      throw new Error("Link expenses after an order is recorded.");
    if (
      !p.transactions.some(
        (t) => t.id === a.expenseId && t.kind === "Expense",
      ) ||
      p.materialRequests.some(
        (t) => t.expenseId === a.expenseId && t.id !== r.id,
      )
    )
      throw new Error(
        "Choose an existing expense not already linked to another order.",
      );
    r.expenseId = a.expenseId;
  } else if (a.action === "movement") {
    const m = material(a.materialId);
    if (a.date > day())
      throw new Error("Stock movements cannot be dated in the future.");
    if (a.kind === "Correction" && (!owner || !a.note.trim()))
      throw new Error("Only the owner can correct stock, with a reason.");
    if (a.kind !== "Correction" && a.quantity <= 0)
      throw new Error("Enter a quantity greater than zero.");
    if (a.kind !== "Delivery" && a.requestId)
      throw new Error("Only deliveries can be matched to a request.");
    if (a.requestId) {
      const r = request(a.requestId);
      if (
        r.materialId !== m.id ||
        !["Ordered", "Part received"].includes(materialStatus(p, r))
      )
        throw new Error("Choose an ordered request for this material.");
      if (a.quantity > Number(r.quantity) - requestReceived(p, r.id))
        throw new Error(
          "Delivery exceeds the outstanding quantity. Record extra stock as a separate delivery with a note.",
        );
    }
    const delta = ["Usage", "Wastage", "Return"].includes(a.kind)
      ? -a.quantity
      : a.quantity;
    if (materialStock(p, m.id) + delta < -0.000001)
      throw new Error(
        "This would make stock negative. Record missing deliveries first.",
      );
    p.materialMovements.push({ ...a, delta, ...stamp });
    m.stockCheckedOn = a.date;
  } else if (a.action === "merge") {
    const source = material(a.sourceId),
      target = material(a.targetId);
    if (
      source.id === target.id ||
      source.unit !== target.unit ||
      materialKey(String(source.title), String(source.spec || "")) !==
        materialKey(String(target.title), String(target.spec || ""))
    )
      throw new Error(
        "Merge only duplicate materials with the same specification and unit.",
      );
    target.received =
      Number(target.received || 0) + Number(source.received || 0);
    target.used = Number(target.used || 0) + Number(source.used || 0);
    target.reorder = Math.max(
      Number(target.reorder || 0),
      Number(source.reorder || 0),
    );
    for (const r of [...p.materialRequests, ...p.materialMovements])
      if (r.materialId === source.id) r.materialId = target.id;
    source.mergedInto = target.id;
    source.mergedAt = now;
    source.mergeReason = a.note;
  }
  p.history = [
    ...(previous.history || []),
    {
      id: crypto.randomUUID(),
      section: "materials",
      action: a.action,
      title: "Material " + a.action,
      actor: user.id,
      at: now,
      before: "null",
      after: JSON.stringify(a),
    },
  ];
  return p;
}
