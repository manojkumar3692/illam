import { test } from "node:test";
import assert from "node:assert/strict";
import { emptyProject, day, type Project } from "../lib/model";
import {
  applyMaterialAction,
  materialStock,
  materialStatus,
  materialKey,
  materialAlerts,
  requestReceived,
} from "../lib/materials";
import { visibleProject, canReadFile } from "../lib/access";
import { projectSchema } from "../lib/validation";
const owner = { id: "owner", name: "Owner" },
  worker = { id: "worker", name: "Worker" };
function seed() {
  return applyMaterialAction(emptyProject(), "owner", owner, {
    action: "create",
    id: "cement",
    title: "Cement",
    spec: "OPC 53",
    unit: "bags",
    reorder: 20,
  });
}
function requested() {
  return applyMaterialAction(seed(), "contractor", worker, {
    action: "request",
    id: "req",
    materialId: "cement",
    quantity: 50,
    neededBy: day(),
  });
}
function ordered() {
  const p = applyMaterialAction(requested(), "owner", owner, {
    action: "review",
    requestId: "req",
    status: "Approved",
  });
  return applyMaterialAction(p, "owner", owner, {
    action: "order",
    requestId: "req",
    supplier: "Supplier",
    expectedDate: day(),
  });
}
function movement(
  p: Project,
  quantity: number,
  kind = "Delivery",
  id: string = crypto.randomUUID(),
  requestId = "",
) {
  return applyMaterialAction(p, "architect", worker, {
    action: "movement",
    id,
    materialId: "cement",
    kind,
    quantity,
    date: day(),
    requestId,
  });
}
test("Canonical catalog prevents duplicates including aliases and different units; specifications stay distinct", () => {
  assert.equal(materialKey("Jalli", "20 mm"), materialKey("Jally", "20mm"));
  assert.equal(materialKey("M sand"), materialKey("M-sand"));
  let p = seed();
  assert.throws(
    () =>
      applyMaterialAction(p, "owner", owner, {
        action: "create",
        id: "dup",
        title: "cement",
        spec: "OPC53",
        unit: "tonnes",
        reorder: 0,
      }),
    /already exist/,
  );
  p = applyMaterialAction(p, "owner", owner, {
    action: "create",
    id: "different",
    title: "Cement",
    spec: "PPC",
    unit: "bags",
    reorder: 0,
  });
  assert.equal(p.materials.length, 2);
  assert.throws(
    () =>
      applyMaterialAction(p, "contractor", worker, {
        action: "create",
        id: "x",
        title: "Steel",
        unit: "kg",
        reorder: 0,
      }),
    /Only the owner/,
  );
});
test("Duplicate open request requires reason; different stage is separate and neither adds stock", () => {
  let p = requested();
  assert.throws(
    () =>
      applyMaterialAction(p, "architect", worker, {
        action: "request",
        id: "dup",
        materialId: "cement",
        quantity: 10,
        neededBy: day(),
      }),
    /open request/,
  );
  p = applyMaterialAction(p, "architect", worker, {
    action: "request",
    id: "extra",
    materialId: "cement",
    quantity: 10,
    neededBy: day(),
    duplicateReason: "Additional work",
  });
  assert.equal(materialStock(p, "cement"), 0);
  assert.equal(p.materialRequests?.length, 2);
});
test("Partial receipts increment stock once and finish original request; overdelivery and retry IDs rejected", () => {
  let p = ordered();
  assert.equal(materialStock(p, "cement"), 0);
  p = movement(p, 30, "Delivery", "delivery1", "req");
  assert.equal(materialStock(p, "cement"), 30);
  assert.equal(materialStatus(p, p.materialRequests![0]), "Part received");
  assert.equal(requestReceived(p, "req"), 30);
  assert.throws(
    () => movement(p, 21, "Delivery", "too-much", "req"),
    /exceeds/,
  );
  assert.throws(
    () => movement(p, 1, "Delivery", "delivery1", "req"),
    /Already saved/,
  );
  p = movement(p, 20, "Delivery", "delivery2", "req");
  assert.equal(materialStatus(p, p.materialRequests![0]), "Received");
  assert.equal(materialStock(p, "cement"), 50);
  assert.equal(p.transactions.length, 0);
  projectSchema.parse(p);
});
test("Usage, wastage and returns reduce stock; corrections require owner and reason; no negative stock", () => {
  let p = movement(seed(), 30);
  p = movement(p, 5, "Usage");
  p = movement(p, 2, "Wastage");
  p = movement(p, 3, "Return");
  assert.equal(materialStock(p, "cement"), 20);
  assert.equal(materialAlerts(p)[0].low, true);
  assert.throws(() => movement(p, 21, "Usage"), /negative/);
  assert.throws(() => movement(p, -1, "Usage"), /greater/);
  assert.throws(() => movement(p, -1, "Correction"), /Only the owner/);
  assert.throws(
    () =>
      applyMaterialAction(p, "owner", owner, {
        action: "movement",
        id: "c",
        materialId: "cement",
        kind: "Correction",
        quantity: -1,
        date: day(),
      }),
    /reason/,
  );
  p = applyMaterialAction(p, "owner", owner, {
    action: "movement",
    id: "c",
    materialId: "cement",
    kind: "Correction",
    quantity: -1,
    date: day(),
    note: "Physical count",
  });
  assert.equal(materialStock(p, "cement"), 19);
});
test("Only owner reviews/orders; cancellation preserves received quantities and blocks further delivery", () => {
  assert.throws(
    () =>
      applyMaterialAction(requested(), "contractor", worker, {
        action: "review",
        requestId: "req",
        status: "Approved",
      }),
    /Only the owner/,
  );
  assert.throws(
    () =>
      applyMaterialAction(requested(), "owner", owner, {
        action: "order",
        requestId: "req",
        supplier: "S",
        expectedDate: day(),
      }),
    /Approve/,
  );
  let p = movement(ordered(), 10, "Delivery", "d", "req");
  p = applyMaterialAction(p, "owner", owner, {
    action: "review",
    requestId: "req",
    status: "Cancelled",
    note: "No more needed",
  });
  assert.equal(materialStock(p, "cement"), 10);
  assert.throws(
    () => movement(p, 5, "Delivery", "d2", "req"),
    /ordered request/,
  );
});
test("Old received/used counts are preserved; merge combines only matching units/spec and retains source", () => {
  let p = seed();
  p.materials[0].received = 100;
  p.materials[0].used = 20;
  assert.equal(materialStock(p, "cement"), 80);
  p.materials.push({ ...p.materials[0], id: "legacy", received: 10, used: 2 });
  p = applyMaterialAction(p, "owner", owner, {
    action: "merge",
    sourceId: "legacy",
    targetId: "cement",
    note: "Duplicate from old stock list",
  });
  assert.equal(materialStock(p, "cement"), 88);
  assert.equal(p.materials[1].mergedInto, "cement");
  assert.throws(
    () =>
      applyMaterialAction(p, "owner", owner, {
        action: "merge",
        sourceId: "cement",
        targetId: "cement",
        note: "Wrong",
      }),
    /Merge only/,
  );
});
test("Expense linking creates no money entry and an expense cannot be linked to two orders", () => {
  let p = ordered();
  p.transactions = [
    { id: "bill", kind: "Expense", amount: 1000, from: "Private bank" },
  ];
  p = applyMaterialAction(p, "owner", owner, {
    action: "linkExpense",
    requestId: "req",
    expenseId: "bill",
  });
  assert.equal(p.transactions.length, 1);
  assert.equal(p.materialRequests![0].expenseId, "bill");
  p.materialRequests!.push({
    ...p.materialRequests![0],
    id: "other",
    expenseId: "",
  });
  assert.throws(
    () =>
      applyMaterialAction(p, "owner", owner, {
        action: "linkExpense",
        requestId: "other",
        expenseId: "bill",
      }),
    /already linked/,
  );
});
test("Worker receives shared stock and delivery proofs but never expense links or private finance; family gets no stock", () => {
  let p = ordered();
  p.materialRequests![0].expenseId = "PRIVATE";
  p.reserve = 99999;
  p = applyMaterialAction(p, "architect", worker, {
    action: "movement",
    id: "photo",
    materialId: "cement",
    kind: "Delivery",
    quantity: 5,
    date: day(),
    requestId: "req",
    fileId: "proof",
  });
  const c = visibleProject(p, "contractor", "different");
  assert.equal(c.materialRequests?.length, 1);
  assert.equal(c.materialMovements?.length, 1);
  assert.equal(c.materialRequests?.[0].expenseId, undefined);
  assert.equal(c.reserve, 0);
  assert.equal(
    canReadFile(p, "contractor", "different", "proof", "worker"),
    true,
  );
  assert.equal(canReadFile(p, "family", "different", "proof", "worker"), false);
  assert.equal(visibleProject(p, "family", "different").materials.length, 0);
});
test("Material suggestions are deduplicated and owner acceptance links the suggestion", () => {
  let p = applyMaterialAction(seed(), "contractor", worker, {
    action: "suggest",
    id: "s",
    title: "Bricks",
    unit: "pieces",
  });
  assert.throws(
    () =>
      applyMaterialAction(p, "architect", worker, {
        action: "suggest",
        id: "s2",
        title: "brick",
        unit: "pieces",
      }),
    /already exists/,
  );
  p = applyMaterialAction(p, "owner", owner, {
    action: "create",
    id: "bricks",
    title: "Bricks",
    unit: "pieces",
    reorder: 500,
    suggestionId: "s",
  });
  assert.equal(p.materialSuggestions?.[0].status, "Added");
  assert.equal(materialStock(p, "bricks"), 0);
});
