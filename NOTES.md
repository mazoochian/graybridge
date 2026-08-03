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

## Overnight session 2 (2026-08-03) — gap-analysis fixes

A full gap-analysis pass was done at the end of session 1 (crash recovery
+ Postgres migration + CSV import/export, all above). This session works
through the greenlit findings from that pass, in priority order. Held
items (Next.js CVE upgrade, real legal policy text, VPS-specific deploy
choices) are intentionally *not* done here — see the plan for why.

### 1. Checkout stock oversell race condition — fixed

`app/api/checkout/route.ts` used to check `variant.stock < qty` and then
do an unconditional `tx.productVariant.update({ data: { stock: {
decrement: qty } } })` later in the same transaction — two concurrent
checkouts on a low-stock variant could both pass the check and both
decrement, taking stock negative. Fixed by replacing the decrement with
`tx.productVariant.updateMany({ where: { ..., stock: { gte: qty } }, data:
{ stock: { decrement: qty } } })` and checking `result.count`; if 0 rows
matched, the transaction throws and rolls back with a "just sold out"
error instead of overselling. This is atomic because Postgres evaluates
the `WHERE` clause as part of the single `UPDATE` statement — safe under
the default Read Committed isolation Prisma uses for interactive
transactions, no need for `SERIALIZABLE` or manual row locking.

Verified with an automated regression test (see below) that spins up two
concurrent checkout requests against a variant with `stock: 1`: exactly
one gets `201`, the other gets `400`, and final stock is `0`, never
negative. To make sure the test wasn't a false positive, it was run once
against the old buggy code (temporarily reverted) — it failed as expected
(`[201, 201]`, stock went negative) — then the fix was restored and the
test passes again.

### 2. Rate limiting on login endpoints — added

`/api/auth/login` (admin) and `/api/account/login` (customer) had no
brute-force protection at all. Added `lib/rate-limit.ts`: an in-memory,
per-process, fixed-window limiter (`checkRateLimit(key, {max, windowMs})`).
Deliberately simple/in-memory because Graybridge deploys as a single Node
process on one VPS, not serverless/multi-instance — if that ever changes,
swap the store for something shared (Redis etc.), every call site goes
through the one function.

Both login routes now check two independent limits before touching the
DB or bcrypt:
- **Per source IP** (`x-forwarded-for` / `x-real-ip`, falls back to
  `"unknown"`): 20 attempts / 15 min — throttles enumeration sweeps
  across many usernames from one IP.
- **Per identifier** (username or email, case-normalized): 5 attempts /
  15 min — protects one account against distributed brute force
  regardless of source IP.

Either limit hit returns `429` with a `Retry-After` header, before any
password comparison. Covered by `tests/api/auth-login.test.ts`.

### 3. Test framework bootstrapped — Vitest

There was no test framework configured at all before this session.
Added Vitest (`vitest.config.mts`, `tests/setup.ts`, `tests/helpers.ts`),
starting with the checkout/auth/inventory critical path as instructed:

- `tests/lib/rate-limit.test.ts` — pure unit tests for the limiter.
- `tests/lib/cart-utils.test.ts` — tax/shipping/discount math regression
  tests (this logic was already solid per the gap analysis; now it's
  pinned down).
- `tests/api/checkout.test.ts` — integration tests against a real
  Postgres DB: normal stock decrement, insufficient-stock rejection, the
  oversell race-condition regression test described above, unknown
  product id, empty cart.
- `tests/api/auth-login.test.ts` — integration tests: successful login,
  wrong password, and the new rate limiting (both per-IP and
  per-identifier) for both admin and customer login.

Run with `npm test` (or `npm run test:watch`).

**Test database**: a second Postgres database, `graybridge_test`, was
created on the same local dev container (`graybridge-pg`, port 5434) —
tests never touch the seeded 150-product dev catalog. Connection info
lives in `.env.test` (gitignored, like `.env`). `tests/setup.ts` loads it
via `dotenv` before any app module is imported, and hard-fails if
`DATABASE_URL` doesn't contain `graybridge_test` — a deliberate guard
rail so a misconfigured run can't ever hit the dev/prod database.

To recreate the test DB from scratch (e.g. on a fresh clone, or after a
schema change):
```
docker exec graybridge-pg psql -U graybridge -d graybridge -c "CREATE DATABASE graybridge_test OWNER graybridge;"
DATABASE_URL="postgresql://graybridge:graybridge_dev_pw@127.0.0.1:5434/graybridge_test?schema=public" npx prisma migrate deploy
```
Integration tests create their own rows (unique SKUs/emails/usernames via
`tests/helpers.ts`'s `uniq()`) and delete them in `afterEach`/`afterAll` —
the test DB is expected to stay empty between runs, but nothing breaks if
stray rows accumulate since everything is scoped by unique identifiers.

**Not done yet**: no CI wiring (no GitHub Actions/etc. — the repo has no
git remote configured to run CI against). Coverage is deliberately
narrow (critical path only) per the plan, not exhaustive. Playwright was
added later in this same session (see below) once the plan reached
riskier UI-changing items.

### 4. Admin Orders: tracking UI wired up, search/filter/pagination added

`updateOrderTracking()` in `app/admin/page.tsx` existed and worked, but
no carrier/tracking-number inputs were ever rendered — clicking around
the Orders view had no way to trigger it. Added the inputs (a Tracking
column in the orders table). `/api/orders` was also hard-capped at
`take: 200` with no search/filter/pagination at all. Added `q` (order
number/name/email), `status`, `page`, `pageSize` query params
server-side, plus a search box, status filter, and Prev/Next pager in
the admin UI.

While building the tracking save, found and fixed two real bugs (not
just test flakiness) via the new e2e coverage:
- **Request race**: the orders-list fetch effect didn't guard against
  out-of-order responses — a slower unfiltered request could resolve
  after a faster filtered one and clobber the results. Fixed with
  `AbortController`, aborting the previous in-flight request whenever
  the effect's dependencies change.
- **Tracking save race**: Carrier and Tracking # saved independently
  on blur, so tabbing between them could fire two PATCH requests, the
  earlier one carrying a stale/empty sibling field; if it resolved
  *after* the complete one it would silently wipe the tracking number.
  Fixed with a single debounced combined save per order, guarded by a
  per-order sequence number.

Playwright was bootstrapped in this session specifically for this and
the next few items — see `playwright.config.ts` / `tests/e2e/`.

### 5. Product soft delete (archive)

Added `Product.archived Boolean @default(false)` via migration
`20260803011616_add_product_archived`. `DELETE /api/products/[id]`
archives instead of hard-deleting — `OrderItem.productId` and
`WishlistItem.productId` reference products by id with no FK
constraint, so a hard delete wouldn't even fail loudly, it would just
silently orphan history. `PATCH` accepts `{ archived }` to restore.
`GET /api/products` excludes archived products for unauthenticated
(public/storefront) requests but includes them for an authenticated
admin session, so the admin dashboard can offer "Show archived" +
Archive/Restore actions per product row.

### 6. Product page catalog[0] fallback bug fixed; error/not-found boundaries added

`app/(store)/product/[id]/page.tsx` used to do
`catalog.find(x => x.id === id) || catalog[0]` — a bad/loading/unknown
id silently rendered a random product instead of a not-found state.
Fixed: distinguishes catalog-still-loading (shows a loading state),
catalog-fetch-failed (shows retry, via new `catalogError`/
`catalogLoading`/`reloadCatalog` on `lib/store.tsx`), and
genuinely-not-found (calls `notFound()`). Verified live by deliberately
reverting the fix temporarily and confirming the new Playwright test
caught the regression, then restoring it.

Added `error.tsx`/`not-found.tsx`/`global-error.tsx` app-wide — none
existed anywhere before. `app/(store)/not-found.tsx` and
`app/(store)/error.tsx` match site styling/chrome (used when
`notFound()`/an error is thrown inside the `(store)` route group).
`app/not-found.tsx`, `app/error.tsx`, and `app/global-error.tsx` are
deliberately dependency-free root-level fallbacks (no `useStore()` etc)
for routes outside that group or failures in the root layout itself —
an error boundary that depends on the thing that might be broken is a
liability.

### 7. PayMarks removed from cart/footer (still payment test-mode-only)

Visa/Mastercard/Amex/PayPal/Apple/Google Pay logos rendered on the cart
page and footer implied real payment processing that doesn't exist yet.
Removed both usages of `<PayMarks />`; kept `components/PayMarks.tsx`
itself (now unused, documented why) for a one-line re-add once a real
payment processor is connected.

### 8. Shop page pagination added

`/api/products` returned the full catalog (all ~150 products + ~2000
variant rows) on every load — used by `lib/store.tsx`'s app-wide
catalog fetch (needed by the homepage, cart line lookups, product-detail
related-items, and the admin dashboard) and by the shop/browse page's
client-side filter/sort. Rearchitecting the app-wide fetch itself was
judged too risky for this pass (core browsing was already-solid, and
homepage/cart/product-detail/admin all lean on it) — instead,
`/api/products` gained *optional* `page`/`pageSize`/`cat`/`tags`/`q`/
`sort` query params: calls without them get the exact unchanged legacy
bare-array response (everything else keeps working as-is), calls with
them get a paginated `{products, total, page, totalPages}` envelope.
The shop page — the actual "browse the catalog" page, and the one place
a user pages through it — now calls this directly instead of
client-filtering the whole eagerly-loaded catalog, with real Prev/Next
controls. **Known scope limit**: the app-wide eager catalog fetch used
by everything else still pulls the full catalog once per session; only
the shop page's own request is paginated. Flagged here rather than
silently narrowed — a future pass could split "product summary" (grid
cards) from "full detail incl. variants" if the catalog grows much
larger than ~150 items.

Also fixed, found via this work: hard-navigating straight to
`/checkout` raced the cart's localStorage hydration against the
"redirect to /cart if empty" effect, occasionally bouncing a user with
real cart items back to `/cart`. Fixed via a new `cartHydrated` flag on
`lib/store.tsx`.

### 9. Six polish items

- **Enter-key form submission**: converted styled-div+onClick pseudo-
  forms to real `<form onSubmit>` for customer login/signup/forgot-
  password/reset-password, admin login, and checkout (address fields +
  place order). The discount code field inside the checkout form gets
  its own Enter behavior (applies the code, doesn't submit the order)
  via `onKeyDown`, since HTML doesn't allow nested `<form>` elements.
- **Silent-failure UI**: account dashboard tab fetches and the
  homepage's catalog fetch now show a real error + retry instead of an
  indistinguishable empty state.
- **Wishlist button** added to the product detail page (previously grid
  cards only).
- **Env vars validated at boot**: `scripts/check-env.mjs`, wired into
  `npm run dev`/`npm start`, fails fast with a clear message if
  `DATABASE_URL`/`AUTH_SECRET` are missing, before the server starts.
  (Next's `instrumentation.ts` `register()` hook was tried first —
  confirmed by testing that on the pinned Next 14.2.35 a thrown error
  there is silently swallowed and the server still reports "Ready", so
  it doesn't actually fail fast. The pre-start script does, and was
  verified both locally and inside the Docker image — see item 10.)
- **Health-check endpoint**: `GET /api/health`, checks real DB
  connectivity (`SELECT 1`), 503 if unreachable, `force-dynamic` so it's
  never statically cached. Wired into the Dockerfile's `HEALTHCHECK`.
- **Admin/customer JWT symmetry**: admin session JWTs now carry
  `kind: "admin"`, matching the customer JWT's `kind: "customer"`
  (forward-compatible — tokens signed before this claim existed are
  still accepted).

### 10. Deployment scaffolding: Dockerfile, security headers, env template

- **Security headers** (`next.config.mjs`): CSP, HSTS, X-Frame-Options,
  X-Content-Type-Options, Referrer-Policy, Permissions-Policy — none
  existed before. The CSP needs `'unsafe-inline'` for both script-src
  (Next's inline hydration payload) and style-src (this codebase renders
  all styling via React `style={...}` props through a custom CSS-string
  helper, `lib/style.ts`'s `s()` — CSP's style-src also governs the
  `style` HTML attribute, not just `<style>` blocks, so this would need
  a real styling-approach change to tighten further). `script-src` also
  gets `'unsafe-eval'` in development only — `next dev`'s webpack HMR
  runtime needs it, confirmed by testing that omitting it breaks client-
  side hydration entirely in dev (every page got stuck on "Loading…").
  Production builds don't get `'unsafe-eval'`. Verified with Playwright
  (no CSP violations across key pages) and by actually running the
  built Docker image.
- **Dockerfile**: multi-stage build (`deps` → `builder` → `runner`),
  Debian `bookworm-slim` base (not Alpine — sidesteps Prisma's
  historical glibc/musl friction), `next.config.mjs`'s new
  `output: "standalone"` so the runner image doesn't need the full
  `node_modules` tree, non-root user, `HEALTHCHECK` hitting
  `/api/health`. Migrations are deliberately NOT run automatically on
  container start (avoids multiple replicas/restarts racing to migrate
  at once) — the Dockerfile documents running them via
  `docker build --target builder` instead, which has the full `prisma`
  CLI toolchain the slim runner image doesn't.
  **Actually built and ran this image** against the real local dev
  Postgres (`--network host`, pointed at the same `graybridge-pg`
  container from the SQLite→Postgres migration) to verify end-to-end:
  homepage 200, `/api/health` reports real DB connectivity, `/api/products`
  returns all 150 real products, admin login works, Docker's own
  `HEALTHCHECK` reports "healthy", and running the image with no env
  vars set fails fast with the expected clear error instead of starting
  broken.
  One non-obvious build-time finding: `lib/prisma.ts` constructs its
  Postgres adapter at module load time, and `next build`'s page-data
  collection step imports every route module (including ones that
  import `lib/prisma.ts`) — so `DATABASE_URL` must be *present*
  (syntactically, doesn't need to be reachable — `pg`'s `Pool` connects
  lazily on first query) at build time or the build itself fails. The
  Dockerfile sets a placeholder for this build stage only; the real
  value comes from `docker run -e DATABASE_URL=...` at runtime.
- **`.env.production.template`**: documents required
  (`DATABASE_URL`, `AUTH_SECRET`) vs optional (`ADMIN_USERNAME`/
  `ADMIN_PASSWORD` seed bootstrap, `RESEND_API_KEY`/`MAIL_FROM`) vars.
  Not filled in with real values (gitignored like the other `.env*`
  files) — a template only.

### 11. Next.js 14.2.35 → 16.2.12 upgrade (attempted and landed)

The plan held this CVE fix until real test coverage existed as a safety
net — by the time item 10 was done, that coverage was in place (33
Vitest + 15 Playwright tests over the checkout/auth/inventory/admin
critical paths), so per the plan's own condition this was attempted, on
a separate branch (`nextjs-16-upgrade-attempt`) so master stayed
deployable regardless of outcome, and it's now merged.

**Why it's worth it**: `npm audit` on 14.2.35 lists ~21 real, disclosed
Next.js CVEs — DoS, SSRF, cache poisoning, XSS, request smuggling — the
exact categories the plan flagged. 16.2.12 resolves all of them.
Confirmed this is a clean net win, not a lateral move: the only *new*
`npm audit` finding on 16.2.12 is a `sharp`/libvips CVE, and `sharp` is
unreachable in this app — it's `next/image`'s optional native
image-processing backend, and `next/image` is never imported anywhere in
this codebase (every image is a plain `<img>` tag, confirmed by
`grep -rn "next/image" app/ components/` returning nothing). The
pre-existing `postcss` finding is a transitive Next.js dependency
present on *both* versions — not something this upgrade introduced.
Skipped v15 as planned (went straight to 16.2.12). React stayed at
18.3.1 — Next 16.2.12's peer dependency range still accepts `^18.2.0`,
so no React major-version bump was needed, which meaningfully lowered
the risk of this being a much bigger undertaking.

**Mechanical changes beyond the version bump**: `next.config.mjs`'s
`experimental.serverComponentsExternalPackages` renamed to top-level
`serverExternalPackages` (graduated out of experimental as of Next 15).
`tsconfig.json` got two changes Next auto-applied on first build:
`jsx: "react-jsx"` (mandatory as of Next 16 — automatic JSX runtime) and
`.next/dev/types/**/*.ts` added to `include`.

**Verification** (same rigor as every other item this session):
`npm run build` and `tsc --noEmit` clean; all 33 Vitest tests pass
unchanged; the actual Dockerfile image was rebuilt against 16.2.12 and
run end-to-end against the real local dev Postgres (homepage, health
check with real DB connectivity, `/api/products` including the new
pagination, admin login, fail-fast without env vars) — no differences
from the same verification done on 14.2.35.

The Playwright suite needed real fixes, not just re-runs, and surfaced
two things worth recording:
1. **Locator collision**: Next 16's dev-mode floating "Open Next.js Dev
   Tools" button has an aria-label that also matches a loose `/next/i`
   button-name filter, colliding with this app's own "Next →"
   pagination button in `tests/e2e/shop-pagination.spec.ts`. Fixed by
   scoping the locator to `<main>` with exact text match.
2. **Dev-mode-only flake, root-caused, not just retried away**: `next
   dev`'s Fast Refresh occasionally performs a full page reload as a
   fallback (the dev server logs "Fast Refresh had to perform a full
   reload" when this happens) — confirmed via testing that this
   reproduces with *both* Turbopack and `--webpack`, so it's an inherent
   `next dev` characteristic, not specific to Turbopack or to this
   upgrade. A hard reload destroys any pending client-side timer (e.g.
   the admin order tracking save's debounce from item 4), which no
   implementation of that timer can survive by definition — it only
   matters in dev-mode e2e testing; a production build never does this.
   Two changes: `playwright.config.ts` now sets `retries: 1` to absorb
   this class of environmental flakiness, and
   `tests/e2e/admin-orders.spec.ts` was refactored so only the test that
   actually exercises the login *form* drives it through the UI — the
   other two tests in that file now reuse its session cookie instead of
   logging in again. This was needed because redundant per-test UI
   logins were eating into `/api/auth/login`'s own 5-attempts/15-minute
   rate limit (item 2) fast enough that a retry on one test could push a
   *later* test's real login over the limit, cascading one flake into
   several failures. With this fix, a full suite run now consistently
   lands at either 15/15 clean or 14 clean + 1 flaky-but-passes-on-retry
   — never a cascade.

**Held, not implemented this session** (per the original plan, still
true): real Privacy/Terms/Shipping/Returns legal text, and VPS-specific
choices (process manager, reverse proxy/TLS, real CI/CD) beyond the
generic Dockerfile/headers/env-template scaffolding from item 10.
