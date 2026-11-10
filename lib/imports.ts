import { day, type Row } from "./model";
export type Draft = Row & { selected: string };
export function parseAmount(value: string): number {
  const clean = value
    .replace(/INR|Rs\.?|₹|AED|USD|\$|CR|DR/gi, "")
    .replace(/[,\s]/g, "")
    .trim();
  if (!/^-?\d+(\.\d{1,2})?$/.test(clean)) return 0;
  return Math.abs(Number(clean));
}
export function importDate(value: string): string {
  const s = value.trim();
  let y = "",
    m = "",
    d = "";
  let match = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (match) [, y, m, d] = match;
  else {
    match = s.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{2}|\d{4})$/);
    if (!match) return "";
    [, d, m, y] = match;
    if (y.length === 2) y = "20" + y;
  }
  const result = `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  const date = new Date(result + "T12:00:00Z");
  return !isNaN(date.getTime()) && date.toISOString().slice(0, 10) === result
    ? result
    : "";
}
function draft(
  amount: number,
  description: string,
  date = "",
  kind = "Expense",
): Draft {
  return {
    id: crypto.randomUUID(),
    selected: "no",
    amount,
    party: description.slice(0, 100),
    date: date || day(),
    kind,
    category: kind === "Contribution" ? "Funding" : "Other",
    from: kind === "Contribution" ? "" : "House fund",
    to: kind === "Contribution" ? "House fund" : "",
    note: description,
  };
}
export function readCSV(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [],
    cell = "",
    quoted = false;
  text = text.replace(/^\uFEFF/, "");
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '"') {
      if (quoted && text[i + 1] === '"') {
        cell += '"';
        i++;
      } else quoted = !quoted;
    } else if (c === "," && !quoted) {
      row.push(cell);
      cell = "";
    } else if ((c === "\n" || c === "\r") && !quoted) {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(cell);
      if (row.some(Boolean)) rows.push(row);
      row = [];
      cell = "";
    } else cell += c;
  }
  row.push(cell);
  if (row.some(Boolean)) rows.push(row);
  return rows;
}
export function parseStatementCSV(text: string): Draft[] {
  const rows = readCSV(text);
  const headerIndex = rows.findIndex((row) =>
    row.some((c) => /^(date|transaction date|txn date)$/i.test(c.trim())),
  );
  if (headerIndex < 0) return [];
  const headers = rows[headerIndex].map((c) => c.trim().toLowerCase());
  const index = (pattern: RegExp) => headers.findIndex((h) => pattern.test(h));
  const date = index(/^(date|transaction date|txn date)$/),
    desc = index(/description|narration|particular|merchant|party/),
    debit = index(/debit|withdrawal/),
    credit = index(/credit|deposit/),
    amount = index(/^amount$/),
    type = index(/^(type|kind|dr\/cr)$/);
  return rows
    .slice(headerIndex + 1)
    .flatMap((row) => {
      const dt = importDate(row[date] || "");
      if (!dt) return [];
      const description = row[desc] || "Statement entry";
      if (
        /opening balance|closing balance|brought forward|carried forward/i.test(
          description,
        )
      )
        return [];
      const dr = parseAmount(row[debit] || ""),
        cr = parseAmount(row[credit] || "");
      if (dr && cr) return [];
      let value = dr || cr;
      let kind = cr ? "Contribution" : "Expense";
      if (!value && amount >= 0) {
        value = parseAmount(row[amount] || "");
        const t = row[type] || "";
        if (/credit|contribution|deposit|^cr$/i.test(t)) kind = "Contribution";
      }
      return value ? [draft(value, description, dt, kind)] : [];
    })
    .slice(0, 300);
}
export function parseDocumentText(
  text: string,
  mode: "bill" | "statement",
): Draft[] {
  const lines = text
    .split(/\n/)
    .map((s) => s.trim())
    .filter(Boolean);
  if (mode === "bill") {
    const dated = text.match(
      /\b(?:\d{4}-\d{2}-\d{2}|\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4})\b/,
    );
    const date = dated ? importDate(dated[0]) : "";
    const candidates = lines.filter(
      (s) =>
        /grand\s*total|net\s*(?:amount|payable|total)|amount\s*(?:due|payable)|total\s*(?:amount|due)|^total\b/i.test(
          s,
        ) && !/sub\s*total|taxable|tax total/i.test(s),
    );
    const preferred =
      candidates.find((s) => /grand\s*total|net\s*payable/i.test(s)) ||
      candidates.at(-1) ||
      "";
    const nums = preferred.match(/\d[\d,]*(?:\.\d{1,2})?/g);
    const amount = nums ? parseAmount(nums.at(-1)!) : 0;
    return [
      draft(
        amount,
        lines.find(
          (s) =>
            /[a-z]/i.test(s) && !/invoice|tax invoice|bill|receipt/i.test(s),
        ) || "Bill",
        date,
      ),
    ];
  }
  return lines
    .flatMap((line) => {
      const m = line.match(
        /^(\d{4}-\d{2}-\d{2}|\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4})\s+(.+)$/,
      );
      if (
        !m ||
        !importDate(m[1]) ||
        /opening balance|closing balance|brought forward|carried forward/i.test(
          m[2],
        )
      )
        return [];
      // Only infer a money movement when the source explicitly labels debit/credit.
      const amount = m[2].match(
        /(?:₹|Rs\.?\s*)?([\d,]+\.\d{2})\s*(DR|CR|debit|credit)\b/i,
      );
      return [
        draft(
          amount ? parseAmount(amount[1]) : 0,
          m[2],
          importDate(m[1]),
          amount && /cr|credit/i.test(amount[2]) ? "Contribution" : "Expense",
        ),
      ];
    })
    .slice(0, 300);
}
export function duplicateEntry(row: Row, existing: Row[]): boolean {
  return existing.some(
    (r) =>
      String(r.date) === String(row.date) &&
      Number(r.amount) === Number(row.amount) &&
      r.kind === row.kind &&
      String(r.party).trim().toLowerCase() ===
        String(row.party).trim().toLowerCase(),
  );
}
