import { test } from "node:test";
import assert from "node:assert/strict";
import {
  parseAmount,
  importDate,
  parseDocumentText,
  parseStatementCSV,
  duplicateEntry,
  readCSV,
} from "../lib/imports";
test("Indian money and invalid dates are handled without guessing", () => {
  assert.equal(parseAmount("₹ 1,25,000.50"), 125000.5);
  assert.equal(parseAmount("123abc"), 0);
  assert.equal(importDate("31/02/2026"), "");
  assert.equal(importDate("10/11/26"), "2026-11-10");
});
test("CSV ignores balances, correctly separates deposits and withdrawals", () => {
  const rows = parseStatementCSV(
    'Date,Description,Debit,Credit,Balance\n10/11/2026,Opening balance,,,50000\n10/11/2026,"Cement, bags","12,000.00",,38000\n11/11/2026,Manoj,,20000,58000',
  );
  assert.equal(rows.length, 2);
  assert.equal(rows[0].amount, 12000);
  assert.equal(rows[1].kind, "Contribution");
  assert.equal(rows[0].selected, "no");
});
test("CSV quoted newlines and escaped quotes survive", () =>
  assert.deepEqual(readCSV('a,b\n"line\none","A ""quote"""'), [
    ["a", "b"],
    ["line\none", 'A "quote"'],
  ]));
test("Bill uses grand total instead of taxes or line amounts", () => {
  const rows = parseDocumentText(
    "ABC Building Supplies\n10/11/2026\nSubtotal 1000.00\nTax total 180.00\nGrand Total INR 1,180.00",
    "bill",
  );
  assert.equal(rows.length, 1);
  assert.equal(rows[0].amount, 1180);
  assert.equal(rows[0].date, "2026-11-10");
});
test("Unclear bills and statement balances never silently become expenses", () => {
  assert.equal(
    parseDocumentText("Cement 500\nBalance 10000", "bill")[0].amount,
    0,
  );
  const rows = parseDocumentText(
    "10/11/2026 Cement 1000.00 50000.00\n11/11/2026 Supplier 250.00 DR 49750.00",
    "statement",
  );
  assert.equal(rows[0].amount, 0);
  assert.equal(rows[1].amount, 250);
});
test("Duplicate detection ignores display casing but checks movement type", () => {
  const r = parseDocumentText("Shop\nTotal 100.00", "bill")[0];
  assert.ok(duplicateEntry({ ...r, party: "SHOP" }, [r]));
  assert.ok(!duplicateEntry({ ...r, kind: "Contribution" }, [r]));
});
