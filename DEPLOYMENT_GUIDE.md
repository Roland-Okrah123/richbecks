# RICHBECKS Enterprise — Installation to Deployment Guide

This walks through everything from an empty computer to a live system your
staff can log into, step by step. No prior Firebase experience assumed.

---

## Part 0 — What you need before starting

- A computer (Windows, Mac, or Linux) with internet access
- A Google account (to create the Firebase project)
- About 30–45 minutes for first-time setup

---

## Part 1 — Install the tools

### 1.1 Install Node.js

Node.js runs the frontend build and the Firebase CLI.

1. Go to [nodejs.org](https://nodejs.org) and download the **LTS** version.
2. Run the installer, accepting the defaults.
3. Confirm it worked — open a terminal (Command Prompt / PowerShell on
   Windows, Terminal on Mac) and run:
   ```bash
   node -v
   npm -v
   ```
   You should see version numbers (Node 18 or newer is fine).

### 1.2 Install the Firebase CLI

```bash
npm install -g firebase-tools
firebase --version
```

### 1.3 Get the project files

Unzip `richbecks-enterprise.zip` somewhere convenient, e.g. your Desktop.
You'll end up with a `richbecks/` folder containing `frontend/` and
`firebase/`.

Open a terminal inside that `richbecks/` folder for everything below.

---

## Part 2 — Create the Firebase project

1. Go to [console.firebase.google.com](https://console.firebase.google.com).
2. Click **Add project**. Name it, e.g. `richbecks-enterprise`. Disable
   Google Analytics unless you want it (not required). Click **Create project**.
3. In the left sidebar: **Build → Authentication → Get started →
   Email/Password → Enable → Save**.
4. In the left sidebar: **Build → Firestore Database → Create database →
   Production mode → choose a location close to Ghana (e.g. `eur3` /
   Europe) → Enable**.
5. Cloud Functions requires the **Blaze (pay-as-you-go) plan** — click
   **Upgrade** at the bottom of the left sidebar and attach a billing
   account. A shop this size will typically cost little to nothing per
   month (Firebase's free monthly quota covers most small-business usage);
   you're only billed for usage beyond the free tier.
6. Still in the console: **Project settings (gear icon) → General → scroll
   to "Your apps" → click the `</>` (Web) icon → nickname it "Richbecks Web"
   → Register app**. You'll see a `firebaseConfig` object — keep this tab
   open, you'll copy values from it in the next step.

---

## Part 3 — Configure and run the frontend locally

```bash
cd frontend
cp .env.example .env
```

Open `.env` in any text editor and paste in the matching values from the
`firebaseConfig` object you saw in Part 2, step 6. It looks like:

```
VITE_FIREBASE_API_KEY=AIzaSy...
VITE_FIREBASE_AUTH_DOMAIN=richbecks-enterprise.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=richbecks-enterprise
VITE_FIREBASE_STORAGE_BUCKET=richbecks-enterprise.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:abc123
VITE_USE_EMULATORS=false
```

Then install and run:

```bash
npm install
npm run dev
```

Open the URL it prints (usually `http://localhost:5173`). You'll see the
Login page — but you can't log in yet, because there's no Owner account and
no security rules deployed. Continue to Part 4.

---

## Part 4 — Deploy Firestore rules and Cloud Functions

```bash
cd ../firebase
firebase login
```

This opens a browser window — sign in with the same Google account you used
to create the Firebase project.

```bash
firebase use --add
```

Pick your project from the list, and when asked for an alias, type `default`.

```bash
firebase deploy --only firestore:rules,firestore:indexes,storage
```

This uploads the role-based security rules (`firestore.rules`) plus the
Storage rules (`storage.rules`, which gate the logo upload feature) so the
database and file storage actually enforce who can read/write what.

Before this will work you also need to enable Storage once in the console:
**Build → Storage → Get started** (accepts the default rules prompt — your
own `storage.rules` file overrides it on deploy).

```bash
cd functions
npm install
cd ..
firebase deploy --only functions
```

This deploys `createSale`, `recordPurchase`, `recordCreditPayment`,
`processReturn`, `createStaffUser`, `setUserStatus`, and the dashboard
aggregation triggers. The first deploy takes a few minutes.

If this step fails with a billing-related error, double check you completed
the Blaze upgrade in Part 2, step 5.

---

## Part 5 — Create your first Owner login

1. In Firebase Console → **Project settings → Service accounts** → click
   **Generate new private key** → confirm. A `.json` file downloads.
2. Rename it to `serviceAccountKey.json` and move it into the `firebase/`
   folder (next to `seed.js`). **Never share this file or commit it to
   Git** — it grants full admin access to your project. It's already listed
   in `.gitignore`.
3. Open `firebase/seed.js` in a text editor and change these two lines near
   the bottom to your real details:
   ```js
   const ownerEmail = 'owner@richbecks.com';
   const ownerPassword = 'ChangeMe123!';
   ```
4. Run it:
   ```bash
   cd firebase
   npm install
   node seed.js
   ```
   This creates the fabric categories, the main branch record, company
   settings, and your Owner account.
5. Go back to the running app (`http://localhost:5173`) and log in with the
   email/password you set. **Change the password immediately** by adding a
   simple change-password flow later, or by resetting it from Firebase
   Console → Authentication → Users if needed right away.

You're now in as Owner. First thing worth doing: go to **Settings** and
upload the real Richbecks Enterprise logo (the circular RB mark) — it
replaces the text badge everywhere (login, sidebar, receipts, reports)
immediately, no redeploy needed.

From here, use the **Users** page in the sidebar to create Manager,
Cashier, Store Keeper, and Accountant accounts — no more manual Firebase
Console work is needed after this point.

---

## Part 6 — Local development with emulators (optional but recommended)

Testing against your live Firebase project while developing is risky (you
could pollute real data). Emulators run a fake local Firebase for safe
testing.

**Terminal 1** — start emulators:
```bash
cd firebase
npm run emulators
```
This opens the Emulator UI at `http://localhost:4000` where you can browse
Firestore data, Auth users, and function logs.

**Terminal 2** — seed sample data into the emulator:
```bash
cd firebase
npm run seed:emulator
```
This creates a sample Owner (`owner@richbecks.test` / `password123`),
sample fabrics, a sample supplier, and a sample customer — all in the local
emulator, not your real project.

**Terminal 3** — point the frontend at the emulators:
In `frontend/.env`, set:
```
VITE_USE_EMULATORS=true
```
Then run `npm run dev` as usual. You're now developing against a completely
disposable local backend. Set it back to `false` when you want to talk to
the real project again.

---

## Part 7 — Deploy the frontend so your team can use it

You have two good options. Firebase Hosting is simplest since you already
have the CLI set up.

### Option A — Firebase Hosting

```bash
cd frontend
npm run build
cd ../firebase
firebase deploy --only hosting
```

The CLI prints a live URL like `https://richbecks-enterprise.web.app`. Share
that with your staff — it works on phones and desktops.

To use your own domain (e.g. `app.richbecks.com`) later: Firebase Console →
**Hosting → Add custom domain** and follow the DNS instructions.

### Option B — Any static host (Netlify, Vercel, etc.)

Run `npm run build` in `frontend/`, then upload the contents of
`frontend/dist/` to your host of choice. The app is a static site — it talks
to Firebase directly from the browser, so no special server config is
needed beyond serving the files.

---

## Part 8 — Day-to-day operations checklist

- **New staff member**: Owner logs in → Users → Add Staff → pick their role.
  They log in immediately with the email/temporary password you set.
- **New stock arrival**: Store Keeper or Manager → Purchases → Record
  Purchase → pick supplier, add fabric lines, save. Inventory updates
  automatically.
- **A sale**: Cashier/Manager/Owner → Sales (POS) → search fabric, add to
  cart, pick customer (or leave as walk-in), choose payment method,
  Complete Sale → Download PDF receipt.
- **Customer paying off credit**: Credit Management → find them → Record
  Payment.
- **Month-end reporting**: Reports page → click the download icon on any
  card for a branded PDF (Sales, Expenses, Inventory, Customer Debt,
  Supplier).

---

## Part 9 — Updating the app later

Whenever you (or I) change the code:

```bash
# Frontend changes
cd frontend
npm run build
cd ../firebase
firebase deploy --only hosting

# Backend (Cloud Functions) changes
cd firebase
firebase deploy --only functions

# Security rules changes
firebase deploy --only firestore:rules
firebase deploy --only storage
```

---

## Part 9c — WhatsApp Sale Notifications (Owner gets a message on every sale)

Every completed sale now triggers a Cloud Function that sends the Owner a
WhatsApp message with the invoice number, customer, total, and payment
method. This uses Meta's **official WhatsApp Cloud API** — not a
third-party bot — because that's the option that keeps working reliably
for years without your number risking a ban.

There's a one-time setup on Meta's side (about 20 minutes), then it's
permanent.

### Step 1 — Create a Meta Developer app

1. Go to [developers.facebook.com](https://developers.facebook.com) and log
   in with a Facebook account (business or personal — you can migrate this
   to a proper Business Manager later).
2. **My Apps → Create App → Other → Business** → give it a name like
   "Richbecks Notifications" → Create app.
3. On the app dashboard, find **WhatsApp** in the product list → **Set up**.

### Step 2 — Get your test credentials

Meta gives you a free test phone number automatically.

1. In **WhatsApp → API Setup**, you'll see a **Temporary access token**
   and a **Phone number ID**. Copy the Phone number ID somewhere safe.
2. Under **To**, add the Owner's real WhatsApp number (with country code)
   as a recipient and verify it via the code WhatsApp sends — while you're
   in test mode, only verified numbers can receive messages.
3. Send a test message from that same page to confirm it arrives on the
   Owner's phone.

### Step 3 — Get a permanent access token

The token shown in Step 2 expires in 24 hours — fine for testing, not for
production.

1. Go to **Business Settings** (top-right menu in Meta Business Suite, or
   via the link on the API Setup page) → **Users → System Users**.
2. **Add** → name it "Richbecks Server" → role **Admin**.
3. **Add Assets** → select your app → give it **Full control**.
4. **Generate New Token** → select your app → check the
   `whatsapp_business_messaging` permission → **Generate Token**.
5. Copy this token immediately — Meta only shows it once. This is your
   permanent `WHATSAPP_TOKEN`.

### Step 4 — Store the credentials in Firebase (never in your code)

```bash
cd firebase
firebase functions:secrets:set WHATSAPP_TOKEN
# paste the permanent token from Step 3 when prompted

firebase functions:secrets:set WHATSAPP_PHONE_NUMBER_ID
# paste the Phone number ID from Step 2 when prompted
```

### Step 5 — Deploy the function

```bash
cd functions && npm install && cd ..
firebase deploy --only functions
```

### Step 6 — Turn it on in the app

Log in as Owner → **Settings** → **Owner WhatsApp Number** → enter the
number in the format shown on that screen (country code, no `+`, no
leading `0` — e.g. `233243262888` for a Ghana number `0243 262 888`) →
Save Changes.

### Step 7 — Test it

Make a sale on the POS page. Within a few seconds, the Owner's WhatsApp
should receive a message like:

```
🧾 New Sale — Richbecks Enterprise

Invoice: INV-2026-00001
Customer: Ama Johnson
Total: GHC 144.00
Paid: GHC 144.00
Payment: MTN Mobile Money
Served by: Kofi Mensah
```

If it doesn't arrive, check **Firebase Console → Functions → Logs** for
`notifyOwnerOnSale` — it logs exactly why (missing settings, expired token,
recipient not verified, etc.) and never blocks the sale itself even if it
fails.

### Moving from test mode to full production

While in test mode, only the phone numbers you've manually verified (Step
2.2) can receive messages — fine for one Owner, but if you later want
alerts going to multiple staff numbers, you'll need to:

1. Verify your business in **Meta Business Suite → Business Settings →
   Business Info** (submit business documents — takes 1–3 days).
2. Under **WhatsApp → API Setup**, request a real WhatsApp Business phone
   number (or migrate an existing one) instead of the free test number.
3. No code changes needed on your end — just swap the
   `WHATSAPP_PHONE_NUMBER_ID` secret to the new number's ID.

Meta's free tier covers 1,000 conversations per month, which comfortably
covers sale-alert volume for a shop this size.

---

## Part 9d — Ongoing Firebase Maintenance (do these regularly, not just once)

Deploying isn't the end — a system that runs for years needs a few light,
recurring habits. None of these take long.

### Weekly (2 minutes)
- Open the app and glance at the Dashboard — if numbers look frozen or
  wrong, something's broken; catch it early.
- **Firebase Console → Functions → Logs** — filter by "Error" severity.
  Cloud Functions fail silently to end users by design (a sale still
  completes even if, say, the WhatsApp alert fails) — this is the only
  place you'll see it happened.

### Monthly (10 minutes)
- **Firebase Console → Usage and billing → Details & settings** — check
  you're within free-tier limits (or that costs match expectations if
  you've grown past them). For a single shop, this is normally GH₵0–very
  small.
- **Authentication → Users** — remove accounts for staff who've left.
  Faster and safer than remembering to do it later: disable via the app's
  Users page (toggle a role inactive) rather than deleting outright, so
  their historical sales/audit records still show a name.
- Skim **Firestore → audit_logs** (via Console, since there's no in-app
  viewer yet) for anything unexpected — repeated failed logins, unusual
  bulk changes.

### Quarterly (30 minutes)
- **Export a Firestore backup.** Firebase doesn't back up your data
  automatically by default. Set up scheduled exports once:
  ```bash
  gcloud firestore export gs://YOUR_PROJECT_ID.appspot.com/backups/$(date +%Y-%m-%d) --project=YOUR_PROJECT_ID
  ```
  or automate it entirely via **Firebase Console → Firestore → Backups →
  Create backup schedule** (a few clicks, no command line needed — this is
  the easier option and worth doing once and forgetting about).
- Check for dependency updates so you're not stuck years behind on
  security patches:
  ```bash
  cd frontend && npm outdated
  cd ../firebase/functions && npm outdated
  ```
  Update cautiously — run `npm update`, then `npm run build` (frontend) or
  redeploy functions to a staging project first if you have one, before
  pushing to production.
- Re-read `firestore.rules` and `storage.rules` and ask: "does every rule
  still match who should access what?" — especially after adding new staff
  roles or features.

### After any code change (every time, not optional)
- Run the frontend typecheck and build locally before deploying:
  ```bash
  cd frontend && npx tsc --noEmit && npm run build
  ```
  This catches most bugs before they ever reach your live system — a
  silent build failure caught on your machine costs you nothing; the same
  bug live costs the Owner a broken POS mid-sale.
- Deploy to Hosting/Functions only after that passes clean (see Part 9 for
  the deploy commands).

### If something breaks in production
1. Check **Firebase Console → Functions → Logs** first — most failures
   (a sale not completing, a notification not sending) show up there with
   a clear message.
2. Check **Firestore → Rules Playground** (Console → Firestore →
   Rules → Playground tab) to simulate whether a specific read/write should
   be allowed — this catches permission-rule bugs without needing to
   reproduce them live.
3. Worst case, **Hosting → any previous deploy → Rollback** — every past
   deploy is kept and one click reverts the live site to it instantly while
   you fix the underlying issue.


If you've already deployed once and this is a code update (like the search,
logo, mobile, and stability fixes), you do **not** create a new Firebase
project or start over. You point this folder at the *same* project and push
the changes.

1. **Confirm which project you deployed to.** In a terminal:
   ```bash
   firebase projects:list
   ```
   Note the exact Project ID (e.g. `richbecks-enterprise`).

2. **Copy your old `.env` values into this new code.** If you still have
   your previous `frontend/.env`, copy it into this new `frontend/` folder.
   If not, get the values again from Firebase Console → Project settings →
   General → Your apps → SDK setup and configuration, and recreate
   `frontend/.env` from `frontend/.env.example` (see Part 3). These values
   don't change between deployments — same project, same config.

3. **Link the CLI to that same project:**
   ```bash
   cd firebase
   firebase use --add
   ```
   Pick the same Project ID from the list, alias it `default` again.

4. **Push everything that changed:**
   ```bash
   firebase deploy --only firestore:rules,firestore:indexes,storage
   cd functions && npm install && cd ..
   firebase deploy --only functions
   cd ../frontend && npm install && npm run build
   cd ../firebase && firebase deploy --only hosting
   ```
   This updates the rules (including the Dashboard/last_login fixes),
   redeploys the Cloud Functions, and republishes the frontend to your
   existing live URL — same address your staff already use, no new link to
   share.

5. **Nothing in your existing data is touched.** Deploying rules, functions,
   and hosting does not delete or modify Firestore data, Auth accounts, or
   uploaded files — it only replaces the app code and the rules that govern
   it. Your fabrics, sales, customers, everything stays exactly as is.

6. **Verify the fixes landed:** open the live URL, hard-refresh (Ctrl/Cmd +
   Shift + R, since the browser may have cached the old version), and check
   the search bar responds, the sidebar collapses into a hamburger menu on
   a phone-width browser window, and Settings shows the logo upload option.

If you *don't* have CLI/terminal access to redeploy yourself, send me the
Project ID and I can walk you through doing it from whatever device you
have — the steps are the same, just typed into whatever terminal you can
reach (including Firebase Console's Cloud Shell, if it comes to that).

---

## Part 10 — Presenting this to Richbecks Enterprise

A practical walkthrough order for a client demo — roughly 15–20 minutes,
building from "looks right" to "does the hard stuff":

**1. Open on the branding (2 min)**
Load the live URL. Point out the charcoal/gold theme matches their
signboard, the RB logo, the tagline. If you've uploaded their real logo via
Settings beforehand, it'll already be showing here — a good opening beat.

**2. Log in and show the Dashboard (2 min)**
Log in as Owner. Walk through the stat cards (today's sales, monthly
revenue, low stock count), the sales trend chart, and the AI insight
banner. This is the "wow, it's watching the business" moment.

**3. Do a live sale on POS (4 min)**
This is the centerpiece — do it on a phone or tablet if you can, to prove
the mobile claim directly. Search a fabric, add a few yards to the cart,
pick or add a customer, choose Mobile Money as payment, complete the sale,
download the PDF receipt. Then flip back to Inventory and show the stock
number actually dropped — this proves the automation isn't just a form,
it's connected.

**4. Show a credit sale (2 min)**
Do a second sale, this time paying less than the total. Show the customer's
credit balance appear on the Customers page, then go to Credit Management
and record a partial payment against it.

**5. Walk the other modules quickly (4 min)**
Suppliers → Purchases (show recording new stock updates Inventory
automatically) → Expenses → Reports (download a PDF report live, it looks
professional and closes the loop on "this is worth what I paid").

**6. Show role-based access (2 min)**
Log in as a Cashier account (create one live in Users if you haven't
already) to show they only see Sales, Customers, Credit — not Settings or
Reports. This demonstrates the system protects itself, not just looks nice.

**7. Close on ownership (2 min)**
Show Settings — company info, logo — and explain they own this outright:
their own Firebase project, their own data, no subscription to a third
party's SaaS product. Mention the deployment guide exists so their own
staff (or you, on retainer) can maintain it for years.

**Before the demo:**
- Seed a few realistic fabrics, a customer or two, and a supplier ahead of
  time so the demo isn't staring at empty tables — empty states are honest
  but don't sell.
- Test the whole flow once on your own phone beforehand, on their actual
  wifi if possible.
- Have the Owner login credentials written down somewhere you can read
  them, not memorized under pressure.


---

## Troubleshooting

| Problem | Likely cause |
|---|---|
| Login page loads but signing in fails silently | `.env` values don't match your Firebase project — recheck Part 3 |
| "Missing or insufficient permissions" errors | Firestore rules not deployed yet — run the Part 4 rules deploy command |
| Cloud Function calls fail with a CORS/network error | Functions not deployed, or you're on the Spark (free) plan — Cloud Functions need Blaze |
| `firebase deploy --only functions` fails | Run `cd functions && npm install` first; check you're on Blaze plan |
| Can't log in as Owner after running `seed.js` | Check the exact email/password you set in `seed.js` before running it; check Firebase Console → Authentication → Users to confirm the account exists |
| PDF export button does nothing | Check the browser console for errors — `jspdf`/`jspdf-autotable` must be installed (`npm install` in `frontend/`) |

If something doesn't match this guide exactly (Firebase's console UI
changes occasionally), the core steps — enable Auth, create Firestore,
upgrade to Blaze, deploy rules/functions, seed the Owner — stay the same.
