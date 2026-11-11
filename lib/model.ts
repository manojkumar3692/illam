export type Row = { id: string; [key: string]: string | number };
export type Section =
  | "transactions"
  | "payments"
  | "stages"
  | "materials"
  | "people"
  | "updates"
  | "decisions"
  | "documents"
  | "cameras";
export type Project = {
  name: string;
  location: string;
  currency: string;
  budget: number;
  reserve: number;
  target: string;
  transactions: Row[];
  payments: Row[];
  stages: Row[];
  materials: Row[];
  people: Row[];
  updates: Row[];
  decisions: Row[];
  documents: Row[];
  cameras: Row[];
  attendance?: Row[];
  archivedPayments?: Row[];
  archivedTransactions?: Row[];
  history?: Row[];
};
export const day = () =>
  new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
export const dateAfter = (days: number) => {
  const d = new Date(day() + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
};
export function emptyProject(): Project {
  return {
    name: "Our new home",
    location: "",
    currency: "INR",
    budget: 0,
    reserve: 0,
    target: "",
    transactions: [],
    payments: [],
    stages: [],
    materials: [],
    people: [],
    updates: [],
    decisions: [],
    documents: [],
    cameras: [],
    attendance: [],
  };
}
export function money(value: number, currency = "INR") {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(value);
}
export function finances(p: Project, today = day()) {
  const sum = (rows: Row[]) =>
    rows.reduce((n, r) => n + Number(r.amount || 0), 0);
  const spent = sum(p.transactions.filter((r) => r.kind === "Expense"));
  const contributed = sum(
    p.transactions.filter((r) => r.kind === "Contribution"),
  );
  const available = contributed - spent;
  const unpaid = p.payments.filter(
    (r) => r.status !== "Paid" && r.status !== "Rejected",
  );
  const end = new Date(today + "T12:00:00Z");
  end.setUTCDate(end.getUTCDate() + 14);
  const upcoming = unpaid.filter(
    (r) => r.due && String(r.due) <= end.toISOString().slice(0, 10),
  );
  const due = sum(upcoming),
    committed = sum(unpaid.filter((r) => r.status === "Approved"));
  const remainingEstimate = p.stages.reduce(
    (n, r) => n + Number(r.remaining || 0),
    0,
  );
  return {
    spent,
    contributed,
    available,
    committed,
    due,
    upcoming,
    topup: Math.max(0, due + p.reserve - available),
    forecast: spent + committed + remainingEstimate,
    progress: p.stages.length
      ? Math.round(
          p.stages.reduce((n, r) => n + Number(r.progress), 0) /
            p.stages.length,
        )
      : 0,
  };
}
export function settlePayment(p: Project, id: string): Project {
  const payment = p.payments.find((r) => r.id === id);
  if (!payment || payment.status !== "Approved")
    throw new Error(
      "Only an approved, unpaid request can be recorded as paid.",
    );
  return {
    ...p,
    payments: p.payments.map((r) =>
      r.id === id
        ? { ...r, status: "Paid", paidAt: new Date().toISOString() }
        : r,
    ),
    transactions: [
      {
        id: crypto.randomUUID(),
        kind: "Expense",
        amount: Number(payment.amount),
        date: day(),
        party: String(payment.party),
        category: String(payment.category || "Contractor"),
        note: String(payment.title),
        from: String(payment.account || "House fund"),
        to: "",
        paymentId: id,
        stageId: payment.stageId || "",
      },
      ...p.transactions,
    ],
  };
}
export function safeUrl(value: string) {
  try {
    const u = new URL(value);
    return u.protocol === "https:" ||
      (u.protocol === "http:" && u.hostname === "localhost")
      ? u.href
      : null;
  } catch {
    return null;
  }
}
export function validateRow(section: Section, row: Row) {
  if (
    (section === "transactions" || section === "payments") &&
    (!Number.isFinite(Number(row.amount)) || Number(row.amount) <= 0)
  )
    throw new Error("Enter an amount greater than zero.");
  if (
    section === "decisions" &&
    (!Number.isFinite(Number(row.amount)) || Number(row.amount) < 0)
  )
    throw new Error("Cost impact must be zero or greater.");
  if (
    section === "transactions" &&
    row.kind === "Expense" &&
    !String(row.from || "").trim()
  )
    throw new Error("Choose the account this expense was paid from.");
  if (
    section === "transactions" &&
    row.kind === "Contribution" &&
    !String(row.to || "").trim()
  )
    throw new Error("Choose the account receiving these funds.");
  if (
    section === "transactions" &&
    row.kind === "Transfer" &&
    (!String(row.from || "").trim() ||
      !String(row.to || "").trim() ||
      row.from === row.to)
  )
    throw new Error("A transfer needs two different accounts.");
  if (
    section === "stages" &&
    (Number(row.progress) < 0 || Number(row.progress) > 100)
  )
    throw new Error("Progress must be between 0 and 100.");
  if (section === "materials" && Number(row.used) > Number(row.received))
    throw new Error("Used quantity cannot exceed received quantity.");
  if (row.url && !safeUrl(String(row.url)))
    throw new Error("Use a valid HTTPS link.");
}
export function demoProject(): Project {
  const row = (id: string, data: Omit<Row, "id">): Row => ({ id, ...data });
  return {
    ...emptyProject(),
    name: "The courtyard house",
    location: "Kochi, Kerala",
    budget: 6500000,
    reserve: 100000,
    target: dateAfter(180),
    transactions: [
      row("t1", {
        kind: "Contribution",
        amount: 1800000,
        date: dateAfter(-40),
        party: "Homeowner",
        category: "Funding",
        from: "",
        to: "House fund",
        note: "Initial construction funds",
      }),
      row("t2", {
        kind: "Expense",
        amount: 640000,
        date: dateAfter(-30),
        party: "Foundation team",
        category: "Labour",
        from: "House fund",
        to: "",
        note: "Foundation and ground works",
      }),
      row("t3", {
        kind: "Expense",
        amount: 420000,
        date: dateAfter(-18),
        party: "Malabar Steel",
        category: "Materials",
        from: "House fund",
        to: "",
        note: "Structural steel delivery",
      }),
      row("t4", {
        kind: "Expense",
        amount: 280000,
        date: dateAfter(-5),
        party: "Concrete supply",
        category: "Materials",
        from: "House fund",
        to: "",
        note: "Ground floor slab",
      }),
      row("t5", {
        kind: "Transfer",
        amount: 60000,
        date: dateAfter(-2),
        party: "Site supervisor",
        category: "Transfer",
        from: "House fund",
        to: "Supervisor",
        note: "Petty cash entrusted; not an expense",
      }),
    ],
    payments: [
      row("p1", {
        title: "First floor reinforcement",
        party: "Malabar Steel",
        amount: 320000,
        due: dateAfter(5),
        status: "Approved",
        category: "Materials",
        account: "House fund",
        note: "Delivery confirmed; quantity checked",
      }),
      row("p2", {
        title: "Masonry milestone",
        party: "Ravi Constructions",
        amount: 180000,
        due: dateAfter(10),
        status: "Pending",
        category: "Labour",
        account: "House fund",
        note: "Awaiting site engineer verification",
      }),
    ],
    stages: [
      row("s1", {
        title: "Planning & approvals",
        progress: 100,
        due: dateAfter(-60),
        owner: "Anjali Menon",
        remaining: 0,
        note: "Approved drawings filed",
      }),
      row("s2", {
        title: "Foundation",
        progress: 100,
        due: dateAfter(-25),
        owner: "Ravi Kumar",
        remaining: 0,
        note: "Engineer inspection complete",
      }),
      row("s3", {
        title: "Structure & masonry",
        progress: 45,
        due: dateAfter(35),
        owner: "Ravi Kumar",
        remaining: 850000,
        note: "First floor reinforcement in progress",
      }),
      row("s4", {
        title: "Electrical & plumbing",
        progress: 0,
        due: dateAfter(80),
        owner: "To be assigned",
        remaining: 700000,
        note: "",
      }),
      row("s5", {
        title: "Finishes & interiors",
        progress: 0,
        due: dateAfter(160),
        owner: "Anjali Menon",
        remaining: 2100000,
        note: "",
      }),
      row("s6", {
        title: "Handover",
        progress: 0,
        due: dateAfter(180),
        owner: "Homeowner",
        remaining: 250000,
        note: "",
      }),
    ],
    materials: [
      row("m1", {
        title: "Cement · OPC 53",
        unit: "bags",
        received: 400,
        used: 312,
        reorder: 100,
        vendor: "Metro Building Supplies",
      }),
      row("m2", {
        title: "TMT steel · 12 mm",
        unit: "kg",
        received: 5000,
        used: 3100,
        reorder: 1000,
        vendor: "Malabar Steel",
      }),
      row("m3", {
        title: "Concrete blocks",
        unit: "pieces",
        received: 6000,
        used: 4200,
        reorder: 1000,
        vendor: "Metro Building Supplies",
      }),
    ],
    people: [
      row("c1", {
        title: "Ravi Kumar",
        role: "Contractor",
        company: "Ravi Constructions",
        phone: "",
        email: "",
        note: "Structure and masonry",
      }),
      row("c2", {
        title: "Anjali Menon",
        role: "Architect",
        company: "Courtyard Studio",
        phone: "",
        email: "",
        note: "Design approvals and finishes",
      }),
      row("c3", {
        title: "Site engineer",
        role: "Engineer",
        company: "Independent consultant",
        phone: "",
        email: "",
        note: "Quality checks before milestone payments",
      }),
    ],
    updates: [
      row("u1", {
        title: "Ground floor slab completed",
        date: dateAfter(-2),
        author: "Site supervisor",
        workers: 8,
        note: "Curing is underway. First-floor reinforcement is scheduled next. Engineer visit needed before the next pour.",
        url: "",
      }),
      row("u2", {
        title: "Steel delivery checked",
        date: dateAfter(-4),
        author: "Site supervisor",
        workers: 6,
        note: "Delivery quantities recorded. Material stored under cover.",
        url: "",
      }),
    ],
    decisions: [
      row("d1", {
        title: "Confirm kitchen window opening",
        owner: "Homeowner",
        due: dateAfter(3),
        amount: 15000,
        status: "Pending",
        note: "Architect proposes a wider opening. Review the revised drawing; estimated extra cost ₹15,000. Approval does not create an expense.",
      }),
    ],
  };
}

export function accountBalances(p: Project) {
  const balances: Record<string, number> = {};
  const adjust = (name: string, amount: number) => {
    if (name) balances[name] = (balances[name] || 0) + amount;
  };
  for (const row of p.transactions) {
    const amount = Number(row.amount);
    if (row.kind === "Contribution")
      adjust(String(row.to || "House fund"), amount);
    if (row.kind === "Expense")
      adjust(String(row.from || "House fund"), -amount);
    if (row.kind === "Transfer") {
      adjust(String(row.from), -amount);
      adjust(String(row.to), amount);
    }
  }
  return balances;
}
