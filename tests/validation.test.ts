import { test } from "node:test";
import assert from "node:assert/strict";
import { projectSchema } from "../lib/validation";
import {
  emptyProject,
  demoProject,
  accountBalances,
  finances,
  validateRow,
} from "../lib/model";
test("Sample and empty projects pass server validation", () => {
  assert.ok(projectSchema.safeParse(emptyProject()).success);
  assert.ok(projectSchema.safeParse(demoProject()).success);
});
test("Server rejects impossible data and duplicate identifiers", () => {
  const p = demoProject();
  p.materials[0].used = 999999;
  assert.equal(projectSchema.safeParse(p).success, false);
  const p2 = demoProject();
  p2.transactions.push(p2.transactions[0]);
  assert.equal(projectSchema.safeParse(p2).success, false);
});
test("Custody balances sum to available funds", () => {
  const p = demoProject(),
    accounts = accountBalances(p);
  assert.equal(accounts.Supervisor, 60000);
  assert.equal(
    Object.values(accounts).reduce((a, b) => a + b, 0),
    finances(p).available,
  );
});
test("A zero-cost decision is valid", () => {
  assert.doesNotThrow(() => validateRow("decisions", { id: "a", amount: 0 }));
  assert.throws(() => validateRow("payments", { id: "a", amount: 0 }));
});
