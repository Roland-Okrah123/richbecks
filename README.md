# RICHBECKS Enterprise — Fabric Shop Management System

A full digital-transformation platform for Richbecks Enterprise (wholesale &
retail fabrics, Sunyani). Built on **React + TypeScript + Tailwind** on the
frontend and **Firebase (Firestore + Auth + Cloud Functions)** on the backend.

**→ For step-by-step setup from a blank computer to a live, deployed system,
see [`DEPLOYMENT_GUIDE.md`](./DEPLOYMENT_GUIDE.md).** This README covers the
quick-reference version and what's included.

## Project structure

```
richbecks/
├── DEPLOYMENT_GUIDE.md    Full install-to-deployment walkthrough
├── frontend/     React + TypeScript + Tailwind app (Vite)
│   └── src/
│       ├── components/GlobalSearch.tsx   Working fabric/customer/supplier search
│       ├── components/ErrorBoundary.tsx  App-wide + per-page crash protection
│       ├── context/SettingsContext.tsx   Company branding (incl. real logo) app-wide
│       ├── pages/Returns.tsx             Returns / exchanges module
│       └── utils/pdf.ts                  Branded PDF receipts & report exports
└── firebase/     Firestore/Storage rules, indexes, and Cloud Functions
    ├── functions/            Callable functions (createSale, recordPurchase, etc.)
    ├── firestore.rules       Role-based security rules
    ├── storage.rules         Logo/fabric-photo upload rules (Owner-gated)
    ├── firestore.indexes.json
    ├── FIRESTORE_DATA_MODEL.md   Full data model reference
    ├── seed.js               One-time setup: reference data + first Owner (live project)
    └── seed-emulator.js      Same, but for local emulator testing
```

## Quick start (see DEPLOYMENT_GUIDE.md for full detail)

```bash
# 1. Frontend
cd frontend && cp .env.example .env   # fill in your Firebase web config
npm install && npm run dev

# 2. Backend
cd ../firebase
firebase login && firebase use --add
firebase deploy --only firestore:rules,firestore:indexes,storage
cd functions && npm install && cd ..
firebase deploy --only functions

# 3. First Owner login
# Download a service account key into firebase/serviceAccountKey.json (see guide)
node seed.js

# 4. Optional: test locally without touching real data
npm run emulators        # terminal 1
npm run seed:emulator    # terminal 2
# set VITE_USE_EMULATORS=true in frontend/.env, then npm run dev
```

## Roles & access

| Role | Access |
|---|---|
| **Owner** | Everything, including Users and Settings |
| **Manager** | Sales, Inventory, Customers, Suppliers, Purchases, Credit, Reports |
| **Cashier** | Sales (POS), Customers, Credit payments |
| **Store Keeper** | Inventory, Purchases, Stock adjustments |
| **Accountant** | Expenses, Credit, Reports |

Roles are enforced in two places: **Firestore Security Rules**
(`firestore.rules`) and the sidebar/route guards in the frontend — so even
if someone bypasses the UI, the database itself refuses unauthorized writes.

## How a sale actually updates stock (important)

Sales are never written directly from the browser. The frontend calls the
`createSale` **Cloud Function**, which runs everything — stock validation,
inventory decrement, invoice numbering, credit creation — inside a single
Firestore transaction. This is what keeps inventory numbers trustworthy even
if two cashiers check out at the same moment. See
`firebase/functions/src/sales.js` and `FIRESTORE_DATA_MODEL.md` for details.

## What's included

- Branded login, dashboard, POS, inventory, customers, suppliers, purchases,
  returns/exchanges, credit management, expenses, reports, an AI
  business-insights panel, staff user management, and company settings —
  all matching the Richbecks charcoal/gold identity.
- **WhatsApp sale alerts** — the Owner gets a WhatsApp message on every
  completed sale (invoice, customer, total, payment method) via Meta's
  official WhatsApp Cloud API. Set up once (see `DEPLOYMENT_GUIDE.md` →
  "WhatsApp Sale Notifications"), then it just runs.
- **Real logo upload** — Settings → Upload Real Logo replaces the placeholder
  badge everywhere (login, sidebar, receipts, reports) instantly, no
  redeploy needed. Stored in Firebase Storage, gated to Owner-only uploads.
- **Working global search** — the search bar in the top bar actually
  searches fabrics, customers, and suppliers as you type and jumps you to
  the right record. On phones it opens as a full-screen search.
- **Responsive on phones and tablets** — the sidebar becomes a slide-in
  drawer below desktop width, list pages switch to touch-friendly cards on
  phones, modals open as bottom sheets, and every data table scrolls
  horizontally instead of being crushed.
- Atomic POS checkout with automatic stock deduction and credit tracking.
- Material-level tracking for material type, color number/code, color name, selling price per yard, and fractional yard quantities.
- Professional receipt workflow with an actual browser/system print dialog plus PDF export; receipt data is sourced from the completed transaction and current business settings.
- Role-based access enforced at the database level, not just the UI —
  including a fix so every role can actually load the Dashboard (the
  original rules accidentally blocked Cashier/Store Keeper from it).
- Branded PDF export for receipts and every report (Sales, Expenses,
  Inventory, Customer Debt, Supplier).
- An app-wide error boundary, plus a per-page one — one broken screen no
  longer takes down the whole app; the sidebar stays usable.
- Every data-loading call now fails gracefully (visible error message
  instead of a silently blank screen) if the network or permissions hiccup.
- Local Firebase emulator setup with a one-command sample-data seed.
- An audit log of sensitive actions (`audit_logs` collection).
- A nightly Cloud Function that recomputes dashboard totals from source data
  so numbers never drift.

## Known gaps to close before charging a client GH₵10,000+

- **Password reset flow**: not yet built — for now, reset via Firebase
  Console → Authentication → Users, or ask me to add a "Forgot password"
  screen using Firebase's built-in `sendPasswordResetEmail`.
- **Firebase App Check**: recommended before going live, to stop the
  callable Cloud Functions being called from outside your app.
- A second (staging) Firebase project before pointing this at real
  production data, so you can test changes safely.
- The real logo doesn't yet appear *inside* generated PDF receipts/reports
  (those still use the text "RB" mark) — screen views are fully wired up,
  PDF embedding is a follow-up if you want it.
