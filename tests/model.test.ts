import { test } from "node:test";
import assert from "node:assert/strict";
import {
  emptyProject,
  finances,
  settlePayment,
  validateRow,
  safeUrl,
  type Row,
} from "../lib/model";
const entry = (id: string, kind: string, amount: number): Row => ({
  id,
  kind,
  amount,
});
test("Custody transfers do not double count costs or reduce total funds", () => {
  const p = emptyProject();
  p.transactions = [
    entry("a", "Contribution", 200000),
    entry("b", "Transfer", 100000),
    entry("c", "Expense", 40000),
  ];
  const f = finances(p);
  assert.equal(f.spent, 40000);
  assert.equal(f.available, 160000);
});
test("Funding includes overdue and next 14 days, reserve; excludes paid and rejected", () => {
  const p = emptyProject();
  p.reserve = 500;
  p.transactions = [entry("a", "Contribution", 1000)];
  p.payments = [
    { id: "a", amount: 700, due: "2026-11-09", status: "Approved" },
    { id: "b", amount: 600, due: "2026-11-24", status: "Pending" },
    { id: "c", amount: 9000, due: "2026-11-25", status: "Approved" },
    { id: "d", amount: 4000, due: "2026-11-10", status: "Paid" },
    { id: "e", amount: 5000, due: "2026-11-10", status: "Rejected" },
  ];
  const f = finances(p, "2026-11-10");
  assert.equal(f.due, 1300);
  assert.equal(f.topup, 800);
  assert.equal(f.committed, 9700);
});
test("Settling payment atomically changes status and records expense only once", () => {
  let p = emptyProject();
  p.payments = [
    {
      id: "a",
      amount: 700,
      status: "Approved",
      party: "Builder",
      title: "Slab",
    },
  ];
  p = settlePayment(p, "a");
  assert.equal(p.transactions.length, 1);
  assert.equal(finances(p).spent, 700);
  assert.equal(p.payments[0].status, "Paid");
  assert.throws(() => settlePayment(p, "a"));
});
test("Pending request cannot be paid", () => {
  const p = emptyProject();
  p.payments = [{ id: "a", status: "Pending" }];
  assert.throws(() => settlePayment(p, "a"));
});
test("Forecast excludes pending payments and adds uncommitted stage estimates", () => {
  const p = emptyProject();
  p.transactions = [entry("a", "Expense", 100)];
  p.payments = [
    { id: "a", amount: 200, status: "Approved" },
    { id: "b", amount: 400, status: "Pending" },
  ];
  p.stages = [{ id: "s", progress: 50, remaining: 300 }];
  assert.equal(finances(p).forecast, 600);
});
test("Unsafe links and impossible inventory are rejected", () => {
  assert.equal(safeUrl("javascript:alert(1)"), null);
  assert.equal(safeUrl("https://example.com"), "https://example.com/");
  assert.throws(() =>
    validateRow("materials", { id: "x", received: 5, used: 6 }),
  );
  assert.throws(() => validateRow("transactions", { id: "x", amount: -1 }));
  assert.throws(() =>
    validateRow("transactions", {
      id: "x",
      kind: "Transfer",
      amount: 1,
      from: "A",
      to: "A",
    }),
  );
});
