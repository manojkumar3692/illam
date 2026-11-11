import { test } from "node:test";
import assert from "node:assert/strict";
import { emptyProject, settlePayment, day, type Project } from "../lib/model";
import { visibleProject, canReadFile } from "../lib/access";
import { applyTeamAction } from "../lib/team";
import { stampReviews } from "../lib/owner-review";
function project(): Project {
  const p = emptyProject();
  p.budget = 987654;
  p.location = "PRIVATE_ADDRESS";
  p.reserve = 444;
  p.transactions = [
    { id: "secret", kind: "Expense", amount: 765432, note: "PRIVATE_LEDGER" },
  ];
  p.stages = [
    {
      id: "foundation",
      title: "Foundation",
      progress: 25,
      budget: 55555,
      remaining: 22222,
      note: "PRIVATE_STAGE",
    },
  ];
  p.payments = [
    {
      id: "mine",
      title: "Own bill",
      amount: 1200,
      status: "Pending",
      submittedBy: "worker",
      submittedAt: "2026-11-11",
      note: "Own note",
      fileId: "own-file",
      account: "PRIVATE_ACCOUNT",
    },
    {
      id: "other",
      amount: 8999,
      status: "Pending",
      submittedBy: "other",
      note: "PRIVATE_OTHER",
      fileId: "other-file",
    },
  ];
  p.updates = [
    {
      id: "private-note",
      title: "PRIVATE_NOTE",
      note: "PRIVATE_NOTE",
      fileId: "secret-file",
    },
    {
      id: "shared-note",
      title: "Shared",
      note: "Shared note",
      shared: "yes",
      fileId: "shared-file",
    },
    { id: "my-note", note: "My note", submittedBy: "worker" },
  ];
  p.people = [{ id: "contact", phone: "PRIVATE_PHONE" }];
  p.attendance = [
    {
      id: "own-attendance",
      userId: "worker",
      person: "Worker",
      date: day(),
      status: "On site",
    },
    {
      id: "other-attendance",
      userId: "other",
      person: "Other",
      date: day(),
      status: "On site",
    },
  ];
  return p;
}
test("Contractor and architect get own claims but never private finance, contacts or other claims", () => {
  for (const role of ["contractor", "architect"]) {
    const v = visibleProject(project(), role, "worker");
    const data = JSON.stringify(v);
    for (const secret of [
      "PRIVATE_",
      "987654",
      "765432",
      "55555",
      "22222",
      "8999",
      "other-attendance",
    ])
      assert.ok(!data.includes(secret), secret);
    assert.equal(v.payments.length, 1);
    assert.equal(v.payments[0].id, "mine");
    assert.equal(v.transactions.length, 0);
    assert.equal(v.attendance?.length, 1);
  }
});
test("Family, friends and unknown roles cannot see any claims or attendance", () => {
  for (const role of ["family", "friend", "unknown", "editor"]) {
    const v = visibleProject(project(), role, "worker");
    assert.equal(v.payments.length, 0);
    assert.equal(v.attendance?.length, 0);
    assert.equal(v.stages[0].budget, undefined);
    assert.ok(!JSON.stringify(v).includes("PRIVATE_"));
  }
});
test("Owner retains full data; old unshared notes stay private", () => {
  const p = project();
  assert.equal(visibleProject(p, "owner", "owner"), p);
  assert.ok(
    !visibleProject(p, "family", "relative").updates.some(
      (r) => r.id === "private-note",
    ),
  );
});
test("Attachment authorization prevents guessing IDs and respects role downgrade", () => {
  const p = project();
  assert.ok(canReadFile(p, "contractor", "worker", "own-file"));
  assert.ok(!canReadFile(p, "contractor", "worker", "other-file"));
  assert.ok(!canReadFile(p, "family", "worker", "own-file", "worker"));
  assert.ok(canReadFile(p, "family", "relative", "shared-file"));
  assert.ok(!canReadFile(p, "family", "relative", "secret-file"));
  assert.ok(canReadFile(p, "owner", "owner", "secret-file"));
});
const entry = () => ({
  action: "request",
  id: crypto.randomUUID(),
  requestType: "Reimbursement",
  title: "Shed materials",
  amount: 1200,
  due: day(),
  spentDate: day(),
  category: "Materials",
  stageId: "foundation",
  status: "Paid",
  submittedBy: "owner",
});
test("Team claims force the real author and pending status; no direct expense is created", () => {
  const p = project();
  const next = applyTeamAction(
    p,
    "contractor",
    { id: "worker", name: "Worker" },
    entry(),
  );
  assert.equal(next.payments[0].status, "Pending");
  assert.equal(next.payments[0].submittedBy, "worker");
  assert.deepEqual(next.transactions, p.transactions);
  assert.equal(next.payments[0].requestType, "Reimbursement");
});
test("Family submissions, unknown stages, missing reimbursement date and duplicate IDs fail", () => {
  const p = project();
  assert.throws(() =>
    applyTeamAction(p, "family", { id: "worker", name: "W" }, entry()),
  );
  assert.throws(() =>
    applyTeamAction(
      p,
      "architect",
      { id: "worker", name: "W" },
      { ...entry(), stageId: "no" },
    ),
  );
  assert.throws(() =>
    applyTeamAction(
      p,
      "architect",
      { id: "worker", name: "W" },
      { ...entry(), spentDate: "" },
    ),
  );
  const a = entry();
  const n = applyTeamAction(p, "architect", { id: "worker", name: "W" }, a);
  assert.throws(() =>
    applyTeamAction(n, "architect", { id: "worker", name: "W" }, a),
  );
});
test("Attendance is once per day and checkout updates only the current user", () => {
  const p = emptyProject();
  const person = { id: "worker", name: "W" };
  const n = applyTeamAction(p, "contractor", person, {
    action: "checkin",
    id: crypto.randomUUID(),
    status: "On site",
  });
  assert.equal(n.attendance?.[0].confirmed, "no");
  assert.throws(() =>
    applyTeamAction(n, "contractor", person, {
      action: "checkin",
      id: crypto.randomUUID(),
      status: "On site",
    }),
  );
  assert.throws(() =>
    applyTeamAction(
      n,
      "contractor",
      { id: "other", name: "O" },
      { action: "checkout" },
    ),
  );
  assert.ok(
    applyTeamAction(n, "contractor", person, { action: "checkout" })
      .attendance?.[0].checkOutAt,
  );
});
test("Daily notes are private by default and author cannot set sharing", () => {
  const p = applyTeamAction(
    emptyProject(),
    "architect",
    { id: "a", name: "Architect" },
    {
      action: "daily",
      id: crypto.randomUUID(),
      title: "Inspection",
      note: "Rebar checked",
      shared: "yes",
    },
  );
  assert.equal(p.updates[0].shared, "no");
  assert.equal(p.updates[0].submittedBy, "a");
});
test("Approval and payment keep server attribution and create a single matching expense", () => {
  const p = emptyProject();
  p.payments = [
    {
      id: "p",
      amount: 1200,
      title: "Bill",
      party: "Worker",
      status: "Pending",
      submittedBy: "worker",
    },
  ];
  const approved = stampReviews(
    p,
    { ...p, payments: [{ ...p.payments[0], status: "Approved" }] },
    "owner",
  );
  assert.equal(approved.payments[0].reviewedBy, "owner");
  const paid = stampReviews(approved, settlePayment(approved, "p"), "owner");
  assert.equal(paid.payments[0].paidBy, "owner");
  assert.equal(paid.transactions.length, 1);
  assert.throws(() =>
    stampReviews(
      p,
      { ...p, payments: [{ ...p.payments[0], status: "Paid" }] },
      "owner",
    ),
  );
  assert.throws(() => stampReviews(p, { ...p, payments: [] }, "owner"));
  assert.throws(() =>
    stampReviews(
      p,
      { ...p, payments: [{ ...p.payments[0], amount: 1 }] },
      "owner",
    ),
  );
  assert.throws(() =>
    stampReviews(
      p,
      { ...p, payments: [{ ...p.payments[0], status: "Rejected" }] },
      "owner",
    ),
  );
  assert.throws(() =>
    stampReviews(paid, { ...paid, transactions: [] }, "owner"),
  );
});
