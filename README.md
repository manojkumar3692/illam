# ILLAM

Live app: https://illam-nine.vercel.app

A homeowner's construction companion built with Next.js, React, TypeScript, Neon Postgres and Neon managed Better Auth. Designed for deployment to Vercel.

## Start locally

Use Node.js 22 (see `.nvmrc`).

```sh
npm ci
npm run dev
```

Open http://localhost:3000. Without server environment variables, the app works as a clearly labelled browser-local demo. With them, sign-up, email verification, sign-in, real project storage and sharing are available. Sample data is never automatically copied into real projects.

```sh
npm test
npm run typecheck
npm run build
```

## Included workflows

- Dashboard: budget, actual spending, available funds, final-cost estimate, stage progress, pending actions.
- 14-day funding forecast: overdue and upcoming requests plus a reserve, minus available funds.
- Ledger: contributions, expenses and transfers; account custody balances; CSV export.
- Payment requests: pending → approved/rejected → paid. Recording a payment creates its expense atomically in one project revision. This does not transfer money through a bank.
- Construction stages: dates, owners, completion percentages and remaining uncommitted cost estimates.
- Materials: cumulative received/used quantities, available stock and reorder thresholds.
- Site diary: dates, crew counts, notes and private attachments or external photo links.
- Decisions: context, owner, deadline, estimated cost impact and approval.
- Contacts and responsibilities; version-labelled documents; secure camera portal bookmarks.
- Multiple homes; owner-managed editor/viewer access; existing verified users can be added by email.
- Signup verification codes, sign-in, sign-out, password reset with email OTP.
- Private PDF/JPG/PNG/WebP attachments up to 3 MB; project JSON and ledger CSV exports.

## Infrastructure

Neon project: `royal-bar-40461375` (`illam`), branch `br-old-glade-bfqxdzv5` (`main`).
Vercel project: `illam`, project ID `prj_CbaYKvK5jdJsEqmUAPCk4w22a0KG`.

The local `.env.local` contains the configured server credentials. It is ignored by Git and Vercel source uploads. Never share or commit it. `.env.example` documents required variables. `DATABASE_URL`, `NEON_AUTH_BASE_URL`, and `NEON_AUTH_COOKIE_SECRET` must be set in Vercel production environment settings. The cookie secret must be at least 32 characters.

`db/001_initial.sql` is already applied to the connected Neon project. For a different database, apply it once, enable managed Better Auth with required email OTP verification, and update environment variables. Add each deployed origin to Neon's Auth trusted origins.

To deploy after linking:

```sh
npx vercel --prod
```

`python3 scripts/configure-vercel.py` can upload the three server values via stdin to a freshly linked project after the account owner authorizes that credential transfer. It does not print secrets. Existing values must be managed in Vercel settings.

## Accounting rules

- Contribution adds available funds. Expense reduces them. Transfer changes custody and never changes total funds or spending.
- Outstanding committed costs are approved, unpaid requests. Rejected and paid requests do not count.
- The funding window includes pending requests and overdue requests. It is a planning figure, not an automatic payment instruction.
- Forecast final cost = spent + approved unpaid requests + remaining _uncommitted_ estimates. Stage estimates must exclude approved requests.
- Progress is an equal-weight average of entered stages, not an engineer-certified measure.
- Dates currently use the India construction-site calendar. Currency changes relabel entered values; they do not convert them.
- Settled payment records are locked in the UI. Correct errors with an explicit review rather than silently deleting financial history.

## Access and storage

Every private API checks the managed auth session, verified email and project membership. Viewers cannot write. Only owners manage sharing. SQL queries are parameterized and mutation requests require same-origin headers. Browser code never receives a database password.

Postgres tables have RLS enabled and public permissions revoked. The server's owner connection enforces project authorization in application queries; do not enable a public database Data API against this schema. Whole-project writes use an expected revision and an atomic update to reject stale edits. Users must refresh to see collaborator changes; live multi-user subscriptions are not implemented.

Files are private and served through authenticated API routes as downloads. For this first pilot, small attachments are stored as base64 in Postgres (about 33% overhead). Move them to object storage before storing substantial photos or video. Deleting a document record currently leaves its binary in storage. JSON exports include file references, not binary backups. Take database backups for full recovery.

## Pilot scope and next work

This is a functional first version for a small number of home projects, not a complete construction ERP. Camera portals open externally; there is no RTSP ingestion, video recording, face recognition, automatic attendance or AI quality verification. Stock quantities are manually maintained totals. There are no bank integrations, automatic reminders, WhatsApp ingestion, quotation comparisons, billing subscriptions or native mobile apps yet.

Before commercial launch: run full multi-user integration tests, use a dedicated email provider, add abuse/storage quotas and monitoring, move attachments to object storage, add full immutable financial events and correction workflows, import/restore, backup recovery tests, and granular contractor/engineer permissions. Editors can approve payments; use viewer access for anyone who must not approve.

## Verification

Financial and server-input tests cover transfers, account balances, funding windows, approval settlement, duplicates, unsafe URLs and invalid inventory. Production build and TypeScript checks pass. Browser smoke tests cover the dashboard, ledger entry creation and browser-local persistence. Cloud schema is installed; unauthenticated private API calls return 401. Real email delivery, authenticated collaborator flows and file uploads need user-account acceptance testing.

## Mobile app experience (November 2026)

The interface is now phone-first, with persistent Home, Money, Site and More tabs, a central quick-add sheet, an expense form with optional details, expandable ledger entries, and larger controls. Browser Back/Forward follows tab navigation. Existing project data is unchanged.

Install from **More → Install**. On iPhone, open in Safari and use Share → Add to Home Screen. On Android, use Chrome’s Install app action. The manifest, PNG app icons, Apple home-screen metadata and safe-area spacing support standalone launch. This is an installable web app, not a separately published App Store or Play Store package. Device installation itself still needs physical-device acceptance testing.

The service worker caches only icons and a generic offline page. It does not cache financial records, auth responses, private attachments or API requests. Real projects require internet. If connectivity drops while the app is open, it explains that saving needs a connection. No offline queue or background sync is claimed.

Mobile QA: 390px browser layout, quick expense creation, ledger, bottom navigation and installation guidance. Existing financial tests remain applicable.

## Public introduction, shop preview and imports

`/` introduces ILLAM with free signup, login and a sample-home preview. `/app` is the construction app and installed-app launch route. `/shop` is a public coming-soon catalogue for CCTV, cement, bricks, paint, home essentials and water loads. There is no ordering, payment or delivery-request collection.

Money → **Read a bill or statement** reads PDF text with PDF.js, CSV statements, and English scan/photo text with Tesseract.js. Extraction runs in the browser. OCR downloads its worker/core/language resources from the library's public CDNs; documents are not uploaded to an AI service. Files are limited to 15 MB, PDFs to 20 pages, and OCR PDFs to 5 scanned pages. Original documents are not attached automatically. The PDF worker in `public/vendor` must be updated alongside `pdfjs-dist`.

Recognition is a review aid, not universal bank-format recognition. CSV supports Date/Transaction Date/Txn Date, Description/Narration/Particulars/Party, Debit/Withdrawal, Credit/Deposit, or Amount and Type columns. Dates accept ISO or day/month/year. PDF statements suggest dated rows, and only infer amounts with explicit DR/CR labels; otherwise the amount stays zero for correction. Bills prefer labelled grand/net totals. Missing dates default to today. English OCR quality depends on the scan. No stock quantities are automatically imported.

No draft is selected by default. Users correct entries, choose expense/funds-added/transfer, confirm review and save. Exact date/amount/movement/party matches are flagged as likely duplicates and blocked until corrected or unselected. Unpaid bills should not be recorded as paid expenses. The existing project revision check protects cloud saves against concurrent edits.

Browser acceptance checks used synthetic files only: CSV debit/credit import through saved demo ledger; text PDF bill total/date; photo-bill OCR total/date; 390px mobile layout. Vani Home is separately provisioned with zero financial entries and no sample progress or stock. The owner's account was verified using the email code supplied during setup.

## Construction stages

Site → Stages supports named stages, optional owner/target date/budget, progress and remaining estimates. Suggested names open a prefilled form; no floors or costs are automatically inserted into real projects. Stages append in build order and can be moved earlier. Stage budgets are planning limits and do not modify the overall home budget.

All record forms and import-review entries support a stage or Whole project. Links use stable stage IDs, so renaming preserves associations. Stage filters cover the ledger and other record lists. Stage cards show spent, tagged funds and pending/approved unpaid requests; transfers are excluded from expense and funds totals. Tagged funds are not a ring-fenced account balance. Payment settlement copies the request's stage to its expense.

Stage deletion requires confirmation with a linked-record count. It removes the stage's plan/budget/remaining estimate, moves linked records to Whole project, and retains the former name as metadata. Money records and overall balances are preserved. Existing untagged data stays valid. The server rejects unknown stage IDs and negative budgets.
