# Client Change Update — Material / POS / Receipt Requirements

## Implemented

- Added `color_number` to material records and sale/purchase/return snapshots.
- Material type, color number, and color are searchable from Inventory, POS, and Global Search.
- Inventory and reports display material identity alongside yard stock and selling price.
- POS supports fractional yard quantities down to 0.01 yard and limits the selected quantity to available stock in the UI.
- `createSale` now treats Firestore as the authoritative source for selling price and material metadata, so the amount charged cannot be altered by a stale/malicious client price.
- Sale validation now rejects invalid quantities, prices, discounts, payments, and unsupported payment methods.
- Sale transactions store `material_type`, `color_number`, `color`, `yards`, `price_per_yard`, and `amount` on each sale item.
- Sale transactions store `change_amount` and return authoritative receipt data to the POS.
- Outstanding balances require a customer so credit tracking remains consistent.
- Purchases and returns now validate yard quantities and numeric amounts; purchase/return snapshots preserve material identity.
- Receipt screen now uses business settings instead of hardcoded client branding.
- Added an actual `Print Receipt` workflow that opens a print-optimized 80mm receipt document and invokes the browser/system print dialog.
- Existing PDF receipt export remains available and now includes material type, color, color number, yards, unit price, totals, payment, balance, and change.
- Report PDFs now use company settings for the business name/tagline/phone instead of hardcoded client identity, and the inventory report includes material type and color number.
- Firestore rules validate core fabric numeric fields and optional material identity fields on create/update.

## Existing data compatibility

Existing `fabrics` documents remain readable. `color_number` is optional at the database-document level so legacy records without a known color code are not broken. When those records are edited, the new field is available for completion.

## Validation performed

- TypeScript project check: passed (`tsc --noEmit -p frontend/tsconfig.json`).
- Cloud Function JavaScript syntax checks: passed for every file in `firebase/functions/src`.
- Full Vite production build was attempted. TypeScript passed, but the build could not reach the Vite/Rollup bundling stage because the uploaded `node_modules` did not contain Rollup's Linux native optional package. Reinstalling dependencies in the current sandbox timed out. This is an environment/dependency-installation limitation, not a TypeScript compile failure.
- Live Firebase transaction testing and physical printer testing require the client's Firebase project/emulator and printer/browser environment; no production credentials were used or modified.

## Deployment note

The active Firebase project configuration documented by the existing README is under `firebase/`, including `firebase/functions/`, Firestore rules/indexes, Storage rules, and seed scripts. The root-level Firebase scaffold is left untouched to avoid changing the existing deployment path unexpectedly.
