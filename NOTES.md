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
- **Per source IP** (rightmost `x-forwarded-for` entry, then `x-real-ip`, falls back to
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

## Roadmap session, Tier 1 (2026-08-03)

A `ROADMAP.md` was written recording a 4-tier improvement plan agreed
with the owner. This entry covers Tier 1 ("security/robustness gaps"),
done immediately after the roadmap was written:

1. **Rate limiting extended beyond login.** `/api/account/signup`,
   `/api/account/forgot-password`, and `/api/account/reset-password` had
   no rate limiting at all — added, reusing the existing
   `lib/rate-limit.ts`. Signup: 8/hour per IP. Forgot-password: 20/15min
   per IP + 3/15min per email (guards against email-bombing one victim's
   inbox regardless of source IP; the generic no-enumeration response is
   unaffected — the 429 only triggers on repeat requests for the *same*
   email). Reset-password: 10/15min per IP. Covered by new
   `tests/api/account-security.test.ts` (4 tests).
2. **Error tracking added (Sentry, `@sentry/nextjs`).** Follows the same
   "isolated behind an env var, no-op until configured" pattern already
   used for `lib/payment.ts`/`lib/mail.ts`: `SENTRY_DSN` (server/edge) and
   `NEXT_PUBLIC_SENTRY_DSN` (browser) are both unset by default, so
   `Sentry.init()` runs with `enabled: false` and does nothing. Added
   `sentry.server.config.ts`, `sentry.edge.config.ts`,
   `instrumentation.ts` (wires both into Next's `register()`/
   `onRequestError` hooks), `instrumentation-client.ts` (browser init +
   router-transition instrumentation). All three client/root/store
   `error.tsx`/`global-error.tsx` boundaries now also call
   `Sentry.captureException(error)` alongside their existing
   `console.error` — React error boundaries aren't covered by Next's own
   server-side `onRequestError` hook, so this needs to be explicit.
   `next.config.mjs` wraps the config with `withSentryConfig` (source-map
   upload only activates if `SENTRY_ORG`/`SENTRY_PROJECT`/
   `SENTRY_AUTH_TOKEN` are set — silently skipped otherwise, doesn't fail
   the build) and the CSP's `connect-src` now conditionally allows the
   Sentry ingest origin, parsed from `NEXT_PUBLIC_SENTRY_DSN` at build
   time, only when that var is set. `npm install @sentry/nextjs` added no
   new `npm audit` findings beyond the two pre-existing ones from item 11
   (transitive `postcss`, unreachable `sharp`). Verified: `npm run build`
   clean, `npm start` boots cleanly with no Sentry warnings, `/api/health`
   and `/` both 200 with SENTRY_DSN unset (the actual default state until
   a Sentry project is chosen).
3. **Added `app/robots.ts` and `app/sitemap.ts`** (Next.js metadata route
   conventions) — previously zero search-engine signals. Robots disallows
   `/admin`, `/account`, `/api`, `/cart`, `/checkout` (transactional/
   private, not content) and allows everything else; sitemap includes the
   homepage, `/shop`, `/about`, and one entry per non-archived product
   (`Product.archived: false`), with `lastModified` from
   `Product.updatedAt`. New `SITE_URL` env var (optional, defaults to
   `http://localhost:3000`) backs the absolute URLs in both — needs a
   real value once a production domain is chosen. Verified by booting the
   server and curling both routes directly; sitemap correctly listed all
   150 seeded products.

All three verified together: `npm run build` clean, all 37 Vitest tests
pass (33 prior + 4 new), production server boots and serves `/api/health`,
`/`, `/robots.txt`, `/sitemap.xml` correctly.

**Not done yet, deliberately**: Tiers 2–4 of `ROADMAP.md` (payment
processor, email provider, real legal pages, VPS specifics, customer
reviews, analytics, catalog-fetch scaling, `next/image`, CI) — next up,
iteratively, per the owner's stated plan.

## Roadmap session, Tier 2 — policy/help pages (2026-08-03)

Tier 2's other items (payment processor, email provider, VPS specifics)
are all blocked on owner decisions/credentials, so this pass took the one
unblocked item: the policy/help pages (`ROADMAP.md` Tier 2 #6).

**The gap was bigger than "no legal text".** `components/Footer.tsx`
listed ten items — Shipping, Returns, Size guide, Contact, Privacy,
Terms, Journal, Stores, Careers, Accessibility — as plain
non-clickable `<div>`/`<span>` text. None of them went anywhere and none
of the pages existed.

**Six real pages added** under `app/(store)`, all server components
(pure prose, no hooks → they prerender statically), sharing a new
`components/PolicyPage.tsx` shell (`PolicyPage`/`PolicySection`/`P`/
`Bullets`) so the layout isn't copy-pasted six times:

- `/shipping` — flat $8, free at $75+, 7% tax, US-only. Written straight
  from the confirmed business rules and `lib/cart-utils.ts`'s actual
  numbers, so the page and the checkout math can't disagree.
- `/returns` — 30-day window, unworn/tags-on condition, how to start one.
- `/privacy` — **grounded in what the code actually does**, not
  boilerplate: the data listed is exactly what `prisma/schema.prisma`
  stores (Customer/Address/Order/WishlistItem fields), the cookie section
  describes the real `gb_customer` HttpOnly JWT from
  `lib/customer-auth.ts` and its real 30-day maxAge, the password
  handling matches the real bcrypt hashing, the reset-token expiry
  matches the real 1-hour TTL, and the "we don't store card numbers"
  claim is true because nothing in the codebase collects them (verified:
  no card fields anywhere in the checkout page or the `Order` model).
  A comment at the top of the file says to keep it that way if the schema
  or integrations change.
- `/terms` — orders/pricing/discount codes/accounts/returns/descriptions.
- `/size-guide` — XS–XL measurement table (the real fixed size range),
  how to measure, between-sizes guidance.
- `/contact` — the three support addresses, workshop address, and a
  pointer to the other pages for the questions they already answer.

**Footer wired up**: the six links now navigate. Journal/Stores/Careers/
Accessibility were **removed** rather than left as dead text — there are
no such pages and inventing four more was out of scope; a comment in
`Footer.tsx` says to re-add each alongside its real page. A Contact link
was added to the Company column in their place. All six pages were also
added to `app/sitemap.ts`.

**Verified**: `npm run build` clean, all six prerender as static (`○`),
all six return 200 with the right `<title>` against a real production
server. New `tests/e2e/policy-pages.spec.ts` pins down that each page
renders its `<h1>` inside the store chrome, that the footer links
actually navigate, and that the four removed items stay gone.

### E2E suite made hermetic (found while verifying the above)

Running the full Playwright suite to verify the new pages, **every test
in it failed** — including specs that had nothing to do with these
changes and had passed in the previous session. Worth recording because
the failure mode is badly misleading.

**Cause, and it wasn't the app**: `app/globals.css` `@import`s the Geist
font family from `fonts.googleapis.com`, and product images load from
`images.unsplash.com`. Both are external requests the browser makes on
essentially every page. When either host is unreachable, the request
**hangs instead of failing fast**, so the page's `load` event never
fires, so every `page.goto` sits until the 30s timeout. The whole suite
goes red at once, which reads exactly like a catastrophic app break — but
`next dev` was serving `/shipping` in 0.68s the whole time, and a
production build served every route fine. Confirmed the diagnosis
directly: `curl https://fonts.googleapis.com/...` from the same machine
hung until timeout.

**Fix**: `tests/e2e/helpers.ts` now exports a `test` fixture extending
Playwright's base that aborts every non-localhost request; all seven
specs import `test`/`expect` from there instead of `@playwright/test`.
These tests assert on markup and behavior, never on which typeface
rendered or whether a photo decoded, so nothing is lost — and the suite
stops depending on two third-party CDNs being up and fast. Full run went
from "all 23 timing out" to **23 passing in ~34s**.

**One real test bug this surfaced**, in `tests/e2e/shop-pagination.spec.ts`:
"the shop page's product request is paginated" collected requests via
`page.on("request")` and asserted only after waiting for the item count
to render. The app-wide catalog fetch can satisfy that gate by itself, so
whether the shop's *own* paginated request had fired yet was down to
incidental page-load timing — previously masked by how slow the external
images were. Rewritten to arm `page.waitForRequest` before navigating and
await it directly, which is deterministic. (The feature itself was never
broken: the two sibling tests that actually drive the pagination controls
passed throughout, and `/api/products?page=&pageSize=` returns the
expected envelope.)

### Two pre-existing bugs found while eyeballing the new pages

Both surfaced from actually loading pages in a browser rather than from
reading code, and both reproduce on `/` and `/about` — pages this pass
never touched — so neither is a regression. Neither is fixed; both are
recorded as `ROADMAP.md` Tier 1b items #13/#14.

- **The site is not responsive at all.** At a 390px mobile viewport every
  page overflows horizontally to *the same* 891px. That the number is
  identical across pages with totally different content points at the
  shared chrome (`Header.tsx`/`Footer.tsx`), not at page content — and it
  confirms the new size-guide table isn't the culprit (its
  `overflow-x:auto` wrapper works; a page with no table overflows the
  same amount).
- **React hydration mismatch on every page**, apparently traced to the
  search `<input>` in `components/Header.tsx`. **This one was later
  withdrawn — see "Hydration mismatch: withdrawn" below.**

**Legal review still required — not resolved by this pass.**

## Responsive pass (2026-08-03) — Tier 1b #13

The site had **zero media queries anywhere** (grepped the whole
codebase) except one existing `.gb-focus:focus-within` rule, and every
page overflowed horizontally at phone widths. Root-caused to three
independent bugs, all fixed, all confirmed by actually rendering pages
in a browser and measuring — not just by reading the CSS:

1. **The header's nav + search row didn't wrap.** Below ~900px the six
   nav links plus the 210px search box no longer fit in one row; with no
   `flex-wrap` and no alternate layout, the header just kept going past
   the viewport edge, dragging every page with it (the header is shared
   chrome). Fixed: `components/Header.tsx` now hides the desktop nav+
   search below 900px (`.gb-header-desktop-nav`, new CSS class) and shows
   a hamburger button (`.gb-header-hamburger`) that opens a slide-down
   mobile menu (`.gb-mobile-menu-panel`) with the search box and all nav
   links stacked, full width. Account/cart icons stay visible in the
   header row at every width. All three classes are defined in
   `app/globals.css` right after `.gb-focus`, extending the same
   established pattern (inline styles via `lib/style.ts`'s `s()` can't
   express media queries, so anything that needs one lives in a small
   named CSS class instead).
2. **Bare `fr` grid tracks respect min-content, not available space.**
   The homepage hero (`grid-template-columns: 1.04fr .96fr`) squeezed its
   image column to 81px wide (and pushed it 78px past a 390px viewport)
   because the text column's 60px heading has a min-content width wider
   than its "fair share" of a narrow viewport — a bare `fr` track's
   *minimum* size defaults to its content's min-content, not zero. This
   pattern existed in every multi-column grid across the storefront:
   homepage (hero, 3 tile categories, 4-col new-arrivals, 2-col banner),
   product detail (2-col top section, 4-col related items), about
   (3-col stats, 2-col story), cart/checkout (content + fixed-340px
   summary sidebar, plus 2-and 3-col address field rows), shop (fixed
   218px filter sidebar + product grid), account (2-col form rows,
   4-col wishlist). Fixed uniformly: nine new CSS classes in
   `globals.css` (`.gb-split-104`, `.gb-split-11`, `.gb-split-even`,
   `.gb-sidebar-340`, `.gb-sidebar-218`, `.gb-cols-3`, `.gb-cols-4`,
   `.gb-row-2`, `.gb-row-3`) replace every bare-`fr`
   `grid-template-columns` inline value across those components with
   `minmax(0, …fr)` tracks (floors the minimum at 0 so a track can
   actually shrink) plus real mobile breakpoints that stack to fewer
   columns (760px for the 2-column split layouts, 860px for the
   fixed-sidebar layouts, 620px for 3/4-up product grids → 2-up, 480px
   for 2/3-up form-field rows → 1-up). The breakpoints themselves were
   picked empirically (swept 1280→320px on the built app and used the
   width each layout actually started breaking at), not guessed.
   **Non-obvious pitfall hit twice while fixing this**: the *media-query
   override* itself must also use `minmax(0, 1fr)`, not a bare `1fr` —
   a single bare-`fr` track still respects min-content, so an early
   version of this fix still overflowed by exactly the width of the
   squeezed content, just at the new breakpoint instead of the old one.
   Confirmed fixed by re-testing after correcting all four override
   blocks.
3. **Large headings didn't shrink at all, independent of the grid fix.**
   Even in a single stacked column, a `font-size: 60px` heading whose
   longest single word doesn't fit a ~264px-wide mobile column will
   overflow — no grid or flex fix helps here, since a word can't be
   split. Found via a `Range.getClientRects()` text-node scan (regular
   element-rect scanning missed this entirely, since the *containing*
   `<h1>`'s own box wasn't widened — only the unbreakable text inside it
   painted past its edge). Fixed by converting every heading ≥36px in
   customer-facing components to `font-size: clamp(min, Nvw, max)`:
   homepage hero (`clamp(34px,8vw,60px)`) and banner
   (`clamp(26px,7vw,36px)`), about page hero (`clamp(30px,9vw,50px)`),
   product detail title (`clamp(24px,7vw,36px)`), and the shared
   `PolicyPage` shell's `<h1>` (`clamp(28px,8vw,42px)`, used by all six
   policy pages). `clamp()` is a plain CSS value — no media query needed,
   and `lib/style.ts`'s `s()` parser passes it through untouched (only
   splits on `;` and the first `:`, so the commas inside `clamp(...)`
   are safe).

**Verification**: wrote a throwaway Playwright script that swept every
customer-facing route (`/`, `/about`, `/shop`, `/product/:id`, `/cart`,
`/checkout`, and all six policy pages) across eleven viewport widths from
320px to 1280px, checking both `document.documentElement.scrollWidth`
*and* a `Range`-based text-node scan (to catch the clamp-worthy
heading-overflow case that element-level checks miss) — zero overflow
anywhere, confirmed twice (once after the grid fix, again after the
heading fix, since the first pass still had two failures at 320px that
the second pass resolved). Also visually confirmed via screenshots at
390px (mobile menu closed and open) and 1280px (desktop, to confirm zero
visual regression) — desktop layout is pixel-identical to before this
pass. Full regression coverage kept permanently in
`tests/e2e/mobile-responsive.spec.ts`: zero-overflow checks at 375px/320px
on the homepage and at 320px on checkout (the deepest nested grid-within-
grid layout in the app), plus a test that the desktop nav is hidden and
the hamburger menu opens, shows the search box and all nav links, and
navigating through it closes the menu and lands on the right URL.

**Not touched by this pass**: the hydration mismatch (Tier 1b #14, since
withdrawn — see below) and the admin panel (`app/admin/page.tsx`) —
admin is a desk tool for the store owner, not customer-facing, so it was
deliberately out of scope here despite having the same bare-`fr` grid
pattern in several places.

## Customer reviews (2026-08-03) — Tier 3 #8

`Product.rating` / `Product.reviews` were static made-up numbers from the
seed generator (`lib/catalog.ts`: `(4.2 + rnd() * 0.7).toFixed(1)` and
`6 + floor(rnd() * 240)`) with no way for anyone to actually submit one.
Now a real feature end to end.

**Schema** (migration `20260803140110_add_product_reviews`): new `Review`
model — `productId`, `customerId`, `rating` (Int 1-5), `title`, `body`,
`verified`, timestamps — with `@@unique([productId, customerId])` so one
customer gets one review per product (re-submitting edits in place rather
than stacking duplicates) and `@@index([productId])` for the list query.
The relation on `Product` is named `reviewList`, not `reviews`, because
`reviews` was already taken by the count column.

**`rating`/`reviews` are now maintained aggregates**, deliberately kept
denormalized on `Product` in exactly the same spirit as `Product.stock`
over `variants` — product grids shouldn't have to join and count reviews
per card. They're recomputed by `recomputeAggregates()` **inside the same
transaction** as every review write/delete, so the aggregate can't drift
from the rows it summarizes. `rating` stays a `String` ("4.0") because
that's the shape the storefront and CSV export already consume.

**The seeded placeholder numbers get replaced on a product's first real
review.** That's intentional: blending invented review counts with real
customer ratings would misrepresent both. The visible consequence is that
a product can now honestly have zero reviews, so the PDP shows
"No reviews yet" instead of a nonsensical "★ 0 (0)" — worth knowing,
since it means the catalog's impressive-looking seeded rating/count
numbers are placeholder marketing data that will decay away as real
reviews arrive.

**API** — `app/api/products/[id]/reviews/route.ts`:
- `GET` is public, returns up to 100 newest reviews with the author's
  name, and flags the caller's own review via a `mine` boolean so the UI
  can offer "Edit your review" instead of a blank form.
- `POST` requires a customer session, validates the rating is a whole
  1-5 (rejects `0`, `6`, `2.5`, `"five"`), clamps title/body length,
  404s on unknown or archived products, and upserts.
- `DELETE` scopes by `customerId`, so one customer can never delete
  another's review; uses `deleteMany` so deleting a nonexistent review is
  a no-op rather than a throw.
- Rate limited via the existing `lib/rate-limit.ts` (20/hr per IP,
  10/hr per customer) — review spam is exactly the abuse case that
  motivated adding that module.

**"Verified purchase"** is computed at write time by checking for an
`OrderItem` for this product on an order belonging to this customer, then
**stored** on the row rather than derived on read — so the badge can't
change retroactively if order history is ever edited.

**UI** — `components/ProductReviews.tsx` on the PDP: star display, an
accessible 1-5 star picker (`role="radiogroup"`/`radio`, proper
`aria-label`s), optional title/body, verified badge, per-review dates,
loading/error/empty states with retry, and edit/delete for your own
review. Signed-out visitors can read reviews; clicking "Write a review"
sends them to sign-in. After a write it calls `reloadCatalog()` so the
header stars and every product card pick up the new aggregate without a
page reload. The PDP's rating also now links down to `#reviews`.

Wired one more dead link found along the way: the PDP's "Size guide" was
a non-clickable `<span>` — now navigates to the `/size-guide` page added
in the Tier 2 pass.

**Tests**: `tests/api/reviews.test.ts` (9 integration tests — auth
required, rating validation, aggregate recompute, multi-review averaging,
upsert-not-duplicate, verified-purchase true *and* false, cross-customer
delete isolation, public list with `mine` flag, 404) and
`tests/e2e/product-reviews.spec.ts` (2 — signed-out redirect, plus a full
write → edit → delete round trip asserting the denormalized header rating
tracks each step). Also verified by hand in a browser at 1280px and
390px, including confirming the reviews section adds no mobile overflow.

**Test-data note**: the e2e spec signs up a throwaway customer against
the **dev** database and ends by deleting its review, which recomputes
product 1 to `reviews: 0, rating: "0"` — it does *not* restore the
seeded `4.3`/`11`. Harmless (those numbers were always fake), but that's
why product 1 may read "No reviews yet" after an e2e run. To restore
seeded values for a specific product, they're deterministic:
`npx tsx -e "import {buildCatalog} from './lib/catalog'; console.log(buildCatalog().find(p=>p.id===1))"`.
The manual browser-verification data created during this pass was cleaned
out and product 1 restored to `4.3`/`11`; dev DB is back to
150 products / 0 reviews / 0 customers.

**Not built in the first pass** — most of this was built immediately
after, see "Reviews, round two" below. Photo uploads remain the one
conscious deferral.

## Reviews, round two (2026-08-03)

Everything flagged as out of scope in the first reviews pass, except
photo uploads.

### Admin moderation

A public review system with no moderation path is a spam/abuse liability,
so this was the priority of the three. New "Reviews" item in the admin
nav backed by:
- `GET /api/reviews` — admin-only, spans every product (distinct from the
  public per-product list), with search across review text / author name
  / author email / product name, a rating filter, and pagination. It
  exposes the reviewer's **email**, which the public endpoint
  deliberately does not, so abuse can be traced to an account.
- `DELETE /api/reviews/[id]` — removes any review regardless of author,
  vs. the customer-facing delete which is always scoped to the caller's
  own row.
- `GET /api/reviews/export` — CSV of every review (product SKU/name,
  author, email, rating, verified, helpful count, title, body, date).
  **Export only, deliberately no import counterpart**: reviews are
  first-party statements attributed to a real account, and bulk-loading
  them from a spreadsheet would make both the author attribution and the
  "Verified purchase" badge meaningless.

`recomputeAggregates` moved out of the route and into
`lib/review-aggregates.ts` as `recomputeReviewAggregates()` — with two
routes now deleting reviews, having two copies of "what the rating means"
was a drift risk rather than a hypothetical.

### Rating histogram

The public review list response now also carries `total`, `average`, and
a 1-5 `distribution`, computed with a `groupBy` over **all** of a
product's reviews rather than the 100 rows the list itself is capped at —
so the histogram stays accurate past that cap. The PDP renders the
average, star row, and a proportional bar per rating (each bar carries an
`aria-label` with the count and percentage, since the bar itself is
decorative).

### Helpfulness voting

New `ReviewVote` model (migration `20260803145554_add_review_helpful_votes`)
with `@@unique([reviewId, customerId])` and `onDelete: Cascade`, plus a
`Review.helpful` count maintained the same way `Product.reviews` is —
recounted inside the vote transaction rather than incremented, so it
can't drift.

- `POST /api/reviews/[id]/helpful` **toggles** rather than exposing
  separate add/remove verbs: the UI is one button whose meaning depends
  on current state, and a single call means client and server can't
  disagree about whether a vote already exists.
- Voting on your own review is a 400, and the UI doesn't render a button
  there at all — it shows the count (or "Your review") instead of a
  control that could only ever error.
- Reviews now sort **most-helpful first, newest as tiebreak**, so the
  first thing a shopper reads is what other shoppers found useful.
- The list response includes `helpful` and `votedByMe`; the caller's own
  votes come back in the same round trip (a conditional `include` on the
  votes relation) rather than a second request.
- The button updates optimistically and **rolls back on failure** with a
  toast — a vote is trivially reversible, so instant feedback is worth
  it, but silently keeping a wrong count is not.

### Testing and verification

`tests/api/review-votes.test.ts` (8) covers toggle on/off, repeat votes
counting once (never 3), self-vote rejection, 404, `votedByMe` for anon
vs. voter, most-helpful-first ordering, and cascade deletion of votes with
their review. `tests/api/reviews.test.ts` gained a distribution/average
test. `tests/e2e/product-reviews.spec.ts` gained a two-browser-context
test (two real shoppers) covering the histogram numbers, one-button-not-
two, persistence across reload, and toggling back off. Admin moderation
was verified by hand in a browser end to end: seeding real reviews
through the storefront, then filtering by rating, searching by
text/product/email, deleting, and confirming the product's rating
recomputed (2 reviews → 1, rating → 5.0), plus a 401 check on the
unauthenticated admin endpoint.

**Two things worth recording from this pass:**

1. **A stale dev server cost real time again.** `next dev` had been
   started *before* `prisma generate` ran for the new `helpful` column,
   so it held an old Prisma client in memory and every review fetch 500'd
   with "Unknown argument `helpful`" — while `tsc` was perfectly clean,
   because the regenerated client was already on disk. After a schema
   change, restart the dev server; a green typecheck says nothing about
   what a long-running process has loaded. (Same class of problem as the
   withdrawn "hydration mismatch" above.)
2. **The new e2e test was polluting itself.** It asserts on whole-product
   aggregates ("2 reviews", "3.5 average"), so a leftover review from an
   earlier failed run silently changed those numbers and made the failure
   look like a product bug — and because it only cleaned up on the happy
   path, each failure made the next run worse. Fixed by resetting the
   test product's reviews at the *start* of the test, not just the end.
   That reset goes through the admin HTTP API rather than Prisma: the
   Playwright runner can't load the generated ESM client (confirmed by
   trying — it fails with "Cannot use 'import.meta' outside a module"),
   and going through the real endpoints means the reset exercises the
   admin delete path instead of reaching around it.
   `playwright.config.ts` now loads `.env` so the test process itself has
   `DATABASE_URL`.

### Still not built: review photos

The one item from the original list left undone, and deliberately so
rather than by omission. Accepting customer-uploaded images on a public
storefront is a materially different commitment from the rest of this
feature: it needs upload authz separate from the existing admin-only
`/api/upload`, real MIME/size/dimension validation, a storage and backup
story on the VPS (the current `public/uploads` directory is not one), and
— the actual blocker — a policy for illegal or abusive image content,
which is a legal question for the owner rather than an engineering one.
Worth doing, but as its own scoped piece of work with the owner's input,
not folded into a review-polish pass. The admin moderation added above is
a prerequisite either way.

## Hydration mismatch: withdrawn, was not a real bug (2026-08-03)

Tier 1b #14 claimed React logged a server/client hydration mismatch on
every page, "traced to the search `<input>` in `components/Header.tsx`".
On investigation **it does not reproduce and the diagnosis was wrong.**
Recorded in full because the reasoning is the reusable part:

- It reproduces on **no** route — checked `/`, `/about`, `/shop`,
  `/product/:id`, `/cart`, `/checkout`, `/shipping`, `/privacy`,
  `/account/login`, `/admin`, at both 1280px and 390px (the mobile
  viewport matters here, since the header renders a genuinely different
  tree there after the responsive pass).
- It's not fixed-by-accident from the responsive pass either. Tested
  directly by restoring `git show HEAD:components/Header.tsx` over the
  working copy and re-running the same sweep: **the original header is
  also clean.** (The working copy was backed up to two locations first
  and byte-compared with `diff` after restoring — the point of the test
  was to rule the header in or out, not to keep the old file.)
- Clean on a **production build** too (`node .next/standalone/server.js`),
  not just `next dev`, which is the case that would actually matter.

The original sighting came from one screenshot run against a `next dev`
server that had been running a long time and had earlier wedged badly
enough that `curl` hung on it (that same hung server is what caused the
mass e2e timeouts documented above). Stale dev-server/HMR state is by far
the likeliest explanation — and note React's own hydration warning text
explicitly lists causes it *can't* distinguish, so "the error names the
`<input>`" was never strong evidence that the `<input>` was at fault; the
tree dump shows the path to the mismatch, not necessarily the culprit.

**Lesson worth keeping**: a symptom seen once, on a dev server already
known to be in a bad state, isn't a bug report yet. The check that
settled it (fresh server + production build + reverting the suspected
file) costs a few minutes and is worth doing before logging a defect —
or before "fixing" something that was never broken. The
Privacy and Terms pages are accurate descriptions of what the software
does, which is a much better starting point than generic boilerplate,
but they have **not been reviewed by a lawyer** and jurisdiction-specific
obligations (GDPR/CCPA disclosures, statutory consumer-rights wording,
etc.) have not been assessed. `ROADMAP.md` Tier 2 #6 stays open for that
reason. Support email addresses across all six pages are
`@graybridge.example` placeholders and need swapping for real,
monitored inboxes before launch.
