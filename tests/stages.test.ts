import { test } from "node:test";
import assert from "node:assert/strict";
import { emptyProject, finances, settlePayment } from "../lib/model";
import {
  stageSummary,
  removeStage,
  stageLinkCount,
  stageName,
} from "../lib/stages";
import { projectSchema } from "../lib/validation";
function home() {
  const p = emptyProject();
  p.stages = [
    {
      id: "foundation",
      title: "Foundation",
      progress: 0,
      remaining: 500,
      budget: 5000,
    },
  ];
  p.transactions = [
    {
      id: "in",
      kind: "Contribution",
      amount: 4000,
      date: "2026-11-11",
      party: "Owner",
      to: "House fund",
      stageId: "foundation",
    },
    {
      id: "out",
      kind: "Expense",
      amount: 1000,
      date: "2026-11-11",
      party: "Supplier",
      from: "House fund",
      stageId: "foundation",
    },
    {
      id: "transfer",
      kind: "Transfer",
      amount: 2000,
      date: "2026-11-11",
      from: "House fund",
      to: "Contractor",
      stageId: "foundation",
    },
  ];
  p.payments = [
    {
      id: "bill",
      title: "Concrete",
      party: "Supplier",
      amount: 1200,
      status: "Approved",
      account: "House fund",
      stageId: "foundation",
    },
  ];
  return p;
}
test("Stage summary excludes custody transfers and paid/rejected requests", () => {
  const p = home();
  p.payments.push(
    { id: "paid", amount: 999, status: "Paid", stageId: "foundation" },
    { id: "no", amount: 999, status: "Rejected", stageId: "foundation" },
  );
  assert.deepEqual(stageSummary(p, "foundation"), {
    spent: 1000,
    funds: 4000,
    due: 1200,
    budget: 5000,
  });
});
test("Settled request passes stage to its expense, without double-counting due", () => {
  const p = settlePayment(home(), "bill");
  assert.equal(p.transactions[0].stageId, "foundation");
  assert.equal(stageSummary(p, "foundation").spent, 2200);
  assert.equal(stageSummary(p, "foundation").due, 0);
});
test("Removing a stage preserves money, records and previous stage name", () => {
  const p = home();
  p.updates = [{ id: "photo", stageId: "foundation", title: "Excavation" }];
  assert.equal(stageLinkCount(p, "foundation"), 5);
  const next = removeStage(p, "foundation");
  assert.equal(next.stages.length, 0);
  assert.equal(next.transactions.length, 3);
  assert.equal(next.payments[0].stageId, "");
  assert.equal(next.updates[0].previousStageTitle, "Foundation");
  assert.equal(finances(next).available, finances(p).available);
  assert.equal(finances(next).spent, finances(p).spent);
  assert.equal(stageSummary(next, "").spent, 1000);
  assert.equal(p.transactions[0].stageId, "foundation");
});
test("Renaming stages retains links; old projects without tags remain valid", () => {
  const p = home();
  p.stages[0].title = "Footings";
  assert.equal(stageName(p, "foundation"), "Footings");
  assert.equal(stageSummary(p, "foundation").spent, 1000);
  assert.ok(projectSchema.safeParse(emptyProject()).success);
  assert.ok(projectSchema.safeParse(p).success);
});
test("Server rejects unknown stage links and negative stage budgets", () => {
  const p = home();
  p.transactions[0].stageId = "missing";
  assert.ok(!projectSchema.safeParse(p).success);
  p.transactions[0].stageId = "foundation";
  p.stages[0].budget = -1;
  assert.ok(!projectSchema.safeParse(p).success);
});
