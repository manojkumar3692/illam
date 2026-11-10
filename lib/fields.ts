import type { Section } from "./model";
export type Field = {
  key: string;
  label: string;
  type?: string;
  options?: string[];
  required?: boolean;
  hint?: string;
};
const f = (
  key: string,
  label: string,
  type = "text",
  required = true,
  options?: string[],
): Field => ({ key, label, type, required, options });
export const fields: Record<Section, Field[]> = {
  transactions: [
    f("kind", "Entry type", "select", true, [
      "Expense",
      "Contribution",
      "Transfer",
    ]),
    f("amount", "Amount", "number"),
    f("date", "Date", "date"),
    f("party", "Paid to / contributed by"),
    f("category", "Category", "select", true, [
      "Materials",
      "Labour",
      "Contractor",
      "Design",
      "Permits",
      "Equipment",
      "Funding",
      "Transfer",
      "Other",
    ]),
    f("from", "From account", "text", false),
    f("to", "To account", "text", false),
    f("note", "Description", "textarea", false),
  ],
  payments: [
    f("title", "Payment for"),
    f("party", "Contractor / supplier"),
    f("amount", "Amount", "number"),
    f("due", "Due date", "date"),
    f("category", "Category", "select", true, [
      "Materials",
      "Labour",
      "Contractor",
      "Design",
      "Other",
    ]),
    f("account", "Payment account"),
    f("note", "Verification / bill reference", "textarea", false),
  ],
  stages: [
    f("title", "Construction stage"),
    f("owner", "Responsible person"),
    f("due", "Target date", "date"),
    f("progress", "Progress (%)", "number"),
    {
      ...f("remaining", "Uncommitted remaining estimate", "number"),
      hint: "Exclude amounts already in approved payment requests to avoid counting them twice.",
    },
    f("note", "Status / verification notes", "textarea", false),
  ],
  materials: [
    f("title", "Material"),
    f("unit", "Unit", "select", true, [
      "bags",
      "kg",
      "tonnes",
      "pieces",
      "m³",
      "m²",
      "litres",
      "loads",
    ]),
    f("received", "Total received", "number"),
    f("used", "Total used", "number"),
    f("reorder", "Low-stock threshold", "number"),
    f("vendor", "Supplier", "text", false),
  ],
  people: [
    f("title", "Full name"),
    f("role", "Role", "select", true, [
      "Contractor",
      "Architect",
      "Engineer",
      "Supervisor",
      "Supplier",
      "Family",
      "Other",
    ]),
    f("company", "Company", "text", false),
    f("phone", "Phone", "tel", false),
    f("email", "Email", "email", false),
    f("note", "Scope / responsibilities", "textarea", false),
  ],
  updates: [
    f("title", "Update title"),
    f("date", "Date", "date"),
    f("author", "Posted by"),
    f("workers", "People on site", "number"),
    f("note", "Work completed / blockers", "textarea"),
    f("url", "Photo link (HTTPS)", "url", false),
  ],
  decisions: [
    f("title", "Decision needed"),
    f("owner", "Decision owner"),
    f("due", "Decide by", "date"),
    f("amount", "Estimated cost impact", "number", false),
    f("note", "Options and context", "textarea"),
  ],
  documents: [
    f("title", "Document name"),
    f("category", "Category", "select", true, [
      "Drawing",
      "Contract",
      "Invoice",
      "Permit",
      "Warranty",
      "Other",
    ]),
    f("version", "Revision"),
    f("url", "Document link (HTTPS)", "url", false),
    f("note", "Notes", "textarea", false),
  ],
  cameras: [
    f("title", "Camera name"),
    f("url", "Secure camera portal URL", "url"),
    f("note", "Location / access instructions", "textarea", false),
  ],
};
export const labels: Record<Section, string> = {
  transactions: "Money ledger",
  payments: "Payments",
  stages: "Build plan",
  materials: "Materials",
  people: "People",
  updates: "Site diary",
  decisions: "Decisions",
  documents: "Documents",
  cameras: "Live site",
};
