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

## Business assumptions made (unwritten anywhere — flag for correction)

- **Payment: no real processor.** `lib/payment.ts` always "succeeds" in
  test mode (no Stripe/other keys configured, none found in `.env`).
  Every order today is `paymentProvider: "test-mode"` and no real money
  moves. This needs a real processor before this could take real orders.
- **Email: no provider configured.** `lib/mail.ts` sends via Resend only
  if `RESEND_API_KEY` is set; otherwise it writes to `local-mail/*.txt`.
  Currently unconfigured, so all "sent" email today is just local files.
- **Tax: flat 7% of subtotal, everywhere**, no per-jurisdiction logic
  (`lib/cart-utils.ts`). Almost certainly wrong for a real US business
  with real customers — flagged as the biggest hidden liability.
- **Shipping: flat $8, free at $75+ subtotal**, no carrier integration,
  no weight/dimension logic, no international rates.
- **Sizes are fixed at XS/S/M/L/XL for every product** (`lib/catalog.ts`
  `SIZES`), regardless of category — even for categories where that may
  not make sense (accessories, etc., if any get added later).
- **Product photography is Unsplash stock photos** (deterministic seed
  data) — fine for development, not real product photos.
- **No refund processing** — an admin can set an order's status to
  "Refunded" but this is a label only; no money is actually returned
  since there's no real payment processor behind it yet.
- **No deployment target has been chosen.** This still runs on SQLite via
  `better-sqlite3` — fine for one instance/single-writer, would need a
  real migration (Postgres, etc.) before any multi-instance deployment.

## What's still just scaffolding / not fully built out

- Customer reviews: `Product.rating`/`Product.reviews` are static seeded
  numbers: there is no UI anywhere for a customer to submit a review.
- No analytics/marketing integrations (no email capture beyond order
  confirmation, no abandoned-cart flow, etc.).
- CSV import/export for products exists (`/api/products/import|export`,
  `lib/csv.ts`) and looked complete on inspection, but wasn't smoke-tested
  in this session — worth a manual check before relying on it for a bulk
  catalog load.

## Suggested next steps

1. Decide on a real payment processor and email provider before any real
   customer traffic.
2. Sanity-check the flat tax/shipping model against actual business
   requirements — this is the part most likely to be legally wrong today.
3. `git log` starts today — see the initial commit for the full tree as
   of this recovery. Everything above (variant grid, discounts/admins
   views, checkout discount UI, image-path fix) is included in it.
