# Graybridge — recovery notes (2026-08-03)

This file exists because the project had no README/CLAUDE.md/roadmap when
development resumed after an abrupt shutdown. It records what was found,
what was fixed, and the product/business assumptions made in the absence
of written direction, so the project owner can correct any of them.

## What Graybridge is (inferred from the code, not written anywhere)

A direct-to-consumer clothing storefront ("graybridge") selling basic
apparel — T-shirts, knitwear, outerwear, etc. — across a small fixed size
range (XS–XL) and a handful of colors per product. Single currency (USD),
whole-dollar pricing (no cents on list price — `Product.price` is an
`Int`). Not multi-vendor, not multi-currency, no B2B/wholesale features.

## State found on resume

No git history existed to diff against, so recovery was done by reading
file mtimes and tracing state/JSX wiring in the admin panel by hand. One
real regression and one incomplete feature were found — both are the kind
of thing that happens mid-edit right before a crash:

1. **Broken production build.** `app/admin/page.tsx` referenced
   `form.stock`, a field that had already been removed from the `Form`
   interface when the schema moved from a single `Product.stock` field to
   per size/color `ProductVariant` rows (three migrations — `orders`,
   `accounts`, `variants_discounts_roles_tracking` — had already landed).
   The admin "Add product" form still had the old flat Stock input, and
   the new variant-grid state (`variantGrid`, `reconcileVariants`) existed
   but had **no rendered UI** — nor did the "Colors" input that drives it.
   Fixed: removed the dead Stock field, added a Colors input, and added a
   color x size stock-entry grid wired to the existing `variantGrid`
   state/`saveForm` logic (which already sent variants correctly to the
   API — only the UI was missing).

2. **Admin "Discounts" and "Admins" nav items rendered a blank page.**
   All state, data fetching, and CRUD handlers for both
   (`createDiscount`/`toggleDiscountActive`/`deleteDiscount`,
   `createAdmin`/`deleteAdmin`) were fully implemented and wired to fully
   working API routes (`/api/discounts*`, `/api/admins*`) — but the JSX
   render blocks for `view === "discounts"` and `view === "admins"` didn't
   exist. Clicking those nav items changed state and fetched data into
   nothing visible. Added both views (code list/create/toggle/delete
   table; admin user list/create/remove table, owner-only).

3. **Discount codes were backend-complete but had no consumer-facing UI.**
   `lib/discount.ts`, `/api/discounts/validate`, and discount handling in
   `/api/checkout` were all fully implemented, but the checkout page had
   no field to enter a code and never sent `discountCode` in its POST
   body. Added a code input + Apply/Remove control to the checkout order
   summary, wired to `/api/discounts/validate` and to the checkout submit.

4. **Image helper didn't handle admin-uploaded images.** `lib/img()` only
   handled bare Unsplash photo IDs (the seeded catalog's format) or full
   `http(s)://` URLs. Anything uploaded through the admin panel's image
   upload (`/api/upload`, which returns `/uploads/<file>`) would render a
   broken image everywhere `img()` is used (product cards, product page,
   admin list/form, cart lines, homepage). Fixed by also passing through
   any value starting with `/`.

All four were verified end-to-end after the fix: `npm run build` is
clean, and a full manual smoke test was run against the dev server
(admin login, discount create + validate + apply at checkout, admin
product create with a full variant grid, checkout with a real discount
code, stock decrementing per-variant and in aggregate, confirmation email
written to `local-mail/`, admin orders list reflecting the order) — then
the test product/order/discount were deleted again so the seeded
150-product / 0-order dev database is back to its clean starting state.

`npm run lint` has never been configured in this project (it prompts to
set up ESLint interactively) — left as-is; `next build`'s own
type-checking is the effective safety net right now and it's clean.

## Business assumptions made (unwritten anywhere) — owner confirmed 2026-08-03

These were flagged as assumptions and sent to the project owner; answers
came back the same day and are recorded here as decisions, not open
questions anymore.

- **Payment: staying in test-mode for now.** `lib/payment.ts` always
  "succeeds" (no Stripe/other processor). Confirmed intentional — revisit
  before taking real orders/money.
- **Email: staying on the `local-mail/` stub for now.** No provider chosen
  yet; owner will pick one later. `lib/mail.ts` still sends via Resend
  automatically if `RESEND_API_KEY` ever gets set — no code change needed
  when that happens.
- **Tax: flat 7% of subtotal, everywhere** — confirmed fine as-is, no
  per-jurisdiction logic needed.
- **Shipping: flat $8, free at $75+ subtotal** — confirmed fine as-is.
- **Product scope confirmed**: basic apparel, USD, whole-dollar pricing,
  fixed XS–XL sizing across all categories.
- **No refund processing** — an admin can set an order's status to
  "Refunded" but this is a label only; no money actually moves, consistent
  with staying in test-mode payments.
- **Deployment target: a VPS, not Vercel** — and the database has been
  migrated off SQLite to Postgres to support that (see below). Nothing
  else about the VPS (OS, process manager, reverse proxy, TLS) has been
  decided yet.

## SQLite → Postgres migration (done 2026-08-02, this session)

Per the owner's deployment decision (VPS, not serverless), the project no
longer uses SQLite/`better-sqlite3`:

- `prisma/schema.prisma`: `datasource db { provider = "postgresql" }`.
- `lib/prisma.ts` and `prisma/seed.ts` now build the Prisma Client with
  `@prisma/adapter-pg` (`PrismaPg`) over a `DATABASE_URL` connection
  string, instead of `@prisma/adapter-better-sqlite3`.
- `better-sqlite3` and `@prisma/adapter-better-sqlite3` were removed from
  `package.json`; `pg` + `@prisma/adapter-pg` (+ `@types/pg`) added.
- `next.config.mjs`'s `serverComponentsExternalPackages` updated from
  `better-sqlite3`/`@prisma/adapter-better-sqlite3` to `pg`/`@prisma/adapter-pg`.
- The old SQLite migration history (4 migrations) doesn't apply to
  Postgres (different SQL dialect), so it was deleted and replaced with a
  single fresh baseline migration, `20260802211656_init_postgres`,
  generated straight from the current schema — there's no production data
  yet, so nothing was lost by squashing history.
- `prisma/dev.db` (SQLite file) removed; `.gitignore` entries for it
  removed since they're no longer relevant.
- **Local dev Postgres**: a dedicated Docker container was started for
  this project (`docker run -d --name graybridge-pg -e
  POSTGRES_USER=graybridge -e POSTGRES_PASSWORD=graybridge_dev_pw -e
  POSTGRES_DB=graybridge -p 127.0.0.1:5434:5432 postgres:16-alpine`,
  bound to `127.0.0.1:5434` specifically to avoid colliding with other
  local projects' Postgres containers on 5432/15432/5433). `.env`'s
  `DATABASE_URL` points at it. If that container isn't running, start it
  with `docker start graybridge-pg` (it was created, not just run
  ephemerally). **This is a local dev convenience only** — the VPS will
  need its own real Postgres instance; just point `DATABASE_URL` at it
  and run `npx prisma migrate deploy` there.
- Re-seeded after the migration (`npx prisma db seed`) — this generated a
  **new** admin password (the old SQLite-era one no longer exists since
  the database was rebuilt from scratch). Current credentials are in
  `.admin-credentials.local.txt` (gitignored).
- Full smoke test suite (admin login, discount create/validate/apply,
  product creation with a full variant grid, checkout with per-variant
  stock decrement + discount usage tracking, confirmation email, admin
  orders view) was re-run against Postgres end-to-end and passes
  identically to the SQLite run. Test data was deleted afterward — the
  Postgres db is back to a clean 150-product/0-order state.

## CSV product import/export (verified 2026-08-02, this session)

Smoke-tested `/api/products/export`, `/api/products/import`, and
`lib/csv.ts` directly against the Postgres database:

- Export → re-import round trip on the full 150-product catalog: 150/150
  updated, 0 errors, and a spot-checked product came back byte-identical
  on every exported field.
- Bulk-created 2 new products via CSV (including a description field with
  an embedded comma and escaped quotes, and a `stock=0` edge case) — both
  created correctly, quoting/escaping handled properly, stock evenly
  redistributed across the color x size variant grid as designed.
- Bad rows (missing name on a new product, missing SKU entirely) produced
  the expected per-row errors without aborting the rest of the batch.
- Auth is enforced on both endpoints (401 without a session cookie).
  Malformed/empty CSV files fail with a clear 400, no crash.
- One real gap found and fixed: the admin UI had no way to trigger either
  endpoint. `importCsv()` existed in `app/admin/page.tsx` but was never
  called from any JSX, and there was no export link at all. Added an
  "Export CSV" link and an "Import CSV" file picker to the Products view
  toolbar, next to "+ Add product".
- Known, intentional limitation: CSV only carries a single aggregate
  `stock` number per product, not a per-size/color breakdown — importing
  always redistributes stock evenly across that product's variant grid
  (same `distributeVariants()` logic the original seed uses). Fine for
  bulk price/tag/description updates; not a way to set uneven per-variant
  stock levels via CSV. Use the admin form's variant grid for that.

Test data (2 created products) was deleted afterward; catalog is back to
150 products.

## Suggested next steps

1. Decide the rest of the VPS deployment picture: OS/host, process
   manager (systemd/pm2/Docker Compose), reverse proxy + TLS, and how
   Postgres backups/persistence are handled there.
2. Pick a payment processor and email provider whenever ready — both are
   isolated behind `lib/payment.ts`/`lib/mail.ts` so wiring in a real one
   later shouldn't require touching the checkout/order code.
3. `git log` starts 2026-08-02 — see the initial commit for the full tree
   as of the crash recovery, the Postgres migration commit, and the CSV
   import/export UI fix. Everything above is included across those
   commits.

## What's still just scaffolding / not fully built out

- Customer reviews: `Product.rating`/`Product.reviews` are static seeded
  numbers: there is no UI anywhere for a customer to submit a review.
- No analytics/marketing integrations (no email capture beyond order
  confirmation, no abandoned-cart flow, etc.).
