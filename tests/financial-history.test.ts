import { test } from "node:test";
import assert from "node:assert/strict";
import { emptyProject, finances, settlePayment, day } from "../lib/model";
import { stampReviews } from "../lib/owner-review";
import { visibleProject } from "../lib/access";
import { stageSummary } from "../lib/stages";
function fixture() {
  const p = emptyProject();
  p.stages = [{ id: "stage", title: "Foundation", progress: 20 }];
  p.transactions = [
    {
      id: "fund",
      kind: "Contribution",
      amount: 10000,
      to: "House fund",
      date: day(),
    },
  ];
  p.payments = [
    {
      id: "claim",
      title: "Labour",
      party: "A",
      amount: 2000,
      status: "Approved",
      stageId: "stage",
      submittedBy: "architect",
      fileId: "bill",
    },
  ];
  return p;
}
test("Removing approved claim archives it and reduces committed/due without changing cash", () => {
  const p = fixture();
  const n = stampReviews(
    p,
    { ...p, payments: [] },
    "owner",
    undefined,
    "Duplicate request",
  );
  assert.equal(finances(n).committed, 0);
  assert.equal(finances(n).due, 0);
  assert.equal(finances(n).available, 10000);
  assert.equal(n.archivedPayments?.[0].status, "Approved");
  assert.equal(n.archivedPayments?.[0].deletedBy, "owner");
  assert.equal(n.history?.[0].reason, "Duplicate request");
});
test("Removing paid request reverses exactly its expense, preserves audit, and updates stage totals", () => {
  const p = stampReviews(fixture(), settlePayment(fixture(), "claim"), "owner");
  assert.equal(finances(p).available, 8000);
  const n = stampReviews(
    p,
    { ...p, payments: [] },
    "owner",
    undefined,
    "Payment entered in error",
  );
  assert.equal(finances(n).available, 10000);
  assert.equal(finances(n).spent, 0);
  assert.equal(stageSummary(n, "stage").spent, 0);
  assert.equal(n.transactions.length, 1);
  assert.equal(n.archivedTransactions?.length, 1);
  assert.equal(n.archivedPayments?.[0].fileId, "bill");
  const again = stampReviews(n, n, "owner");
  assert.equal(again.archivedTransactions?.length, 1);
  assert.equal(again.history?.length, n.history?.length);
});
test("Removing a linked expense also archives its paid claim; removing money in reverses contributions", () => {
  const p = stampReviews(fixture(), settlePayment(fixture(), "claim"), "owner");
  const n = stampReviews(
    p,
    { ...p, transactions: p.transactions.filter((t) => !t.paymentId) },
    "owner",
    undefined,
    "Wrong payment",
  );
  assert.equal(n.payments.length, 0);
  assert.equal(finances(n).available, 10000);
  const x = stampReviews(
    n,
    { ...n, transactions: [] },
    "owner",
    undefined,
    "Wrong funding entry",
  );
  assert.equal(finances(x).contributed, 0);
});
test("Archive and history cannot be forged, erased, or resurrected by owner payload", () => {
  const p = fixture();
  assert.throws(
    () => stampReviews(p, { ...p, payments: [] }, "owner"),
    /reason/,
  );
  const n = stampReviews(
    p,
    { ...p, payments: [] },
    "owner",
    undefined,
    "Duplicate",
  );
  const clean = stampReviews(
    n,
    { ...n, archivedPayments: [], history: [] },
    "owner",
  );
  assert.deepEqual(clean.archivedPayments, n.archivedPayments);
  assert.deepEqual(clean.history, n.history);
  assert.throws(
    () => stampReviews(n, { ...n, payments: p.payments }, "owner"),
    /removed entry/,
  );
});
test("Worker sees own removed status but no funding, archive, or owner history; contractor has no stage progress", () => {
  const n = stampReviews(
    fixture(),
    { ...fixture(), payments: [] },
    "owner",
    undefined,
    "Duplicate",
  );
  const a = visibleProject(n, "architect", "architect");
  assert.equal(a.payments[0].status, "Removed");
  assert.equal(a.payments[0].deletionReason, "Duplicate");
  assert.equal(a.stages[0].progress, 20);
  assert.equal(a.history, undefined);
  assert.equal(a.archivedTransactions, undefined);
  const c = visibleProject(n, "contractor", "another");
  assert.equal(c.payments.length, 0);
  assert.equal(c.stages[0].progress, undefined);
  assert.equal(c.stages[0].due, undefined);
});

test("Architect spending exposes expense totals only: no contributions, transfers, balances, reserve or account details", () => {
  const p = fixture();
  p.reserve = 67890;
  p.budget = 88888;
  p.transactions.push(
    {
      id: "cost",
      kind: "Expense",
      amount: 500,
      from: "PRIVATE_ACCOUNT",
      note: "PRIVATE_NOTE",
      fileId: "PRIVATE_BILL",
      party: "Supplier",
      stageId: "stage",
    },
    {
      id: "custody",
      kind: "Transfer",
      amount: 4000,
      from: "Owner",
      to: "Contractor",
    },
  );
  const a = visibleProject(p, "architect", "architect");
  assert.equal(a.transactions.length, 1);
  assert.equal(a.transactions[0].amount, 500);
  assert.equal(a.reserve, 0);
  assert.equal(a.budget, 0);
  assert.ok(!JSON.stringify(a).includes("PRIVATE_"));
  assert.ok(
    !a.transactions.some(
      (t) => t.kind === "Contribution" || t.kind === "Transfer",
    ),
  );
  assert.equal(
    visibleProject(p, "contractor", "contractor").transactions.length,
    0,
  );
});
