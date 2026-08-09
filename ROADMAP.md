# Graybridge Roadmap (2026-08-03)

This records the improvement plan agreed with the project owner, to be
worked through iteratively. See `NOTES.md` for the detailed history of
everything already fixed/built before this roadmap was written (crash
recovery, Postgres migration, checkout race fix, rate limiting on login,
Vitest/Playwright suites, Docker deployment scaffolding, Next.js 16
upgrade).

Baseline confirmed clean at the time of writing: `npm run build` clean,
33/33 Vitest tests passing, git history clean (11 commits, `master`).

## Tier 1 — security/robustness gaps (small, high value) — DONE 2026-08-03

1. **Rate limiting gaps.** ~~Only `/api/auth/login` (admin) and
   `/api/account/login` (customer) use `lib/rate-limit.ts`.~~ Fixed:
   `signup`/`forgot-password`/`reset-password` now rate-limited too. See
   `NOTES.md` "Roadmap session, Tier 1" for specifics + tests.
2. **No error tracking.** ~~No Sentry (or equivalent) anywhere.~~ Fixed:
   `@sentry/nextjs` wired in, no-op until `SENTRY_DSN`/
   `NEXT_PUBLIC_SENTRY_DSN` are set (see `.env.production.template`).
3. **No `robots.txt`/`sitemap.xml`.** ~~Zero search-engine signals.~~
   Fixed: `app/robots.ts` + `app/sitemap.ts` added, backed by a new
   `SITE_URL` env var.

## Tier 2 — going live for real

4. Pick and wire a real payment processor (Stripe is the natural fit —
   `lib/payment.ts` is already isolated for this, currently always
   "succeeds").
5. Pick an email provider and set `RESEND_API_KEY` — `lib/mail.ts`
   already auto-switches from the `local-mail/` stub once that env var
   is set; this is mostly a business decision + domain verification.
6. Real legal pages — Privacy/Terms/Shipping/Returns. **Partly done
   2026-08-03**: six pages now exist and the previously-dead footer links
   are wired up (`/shipping`, `/returns`, `/privacy`, `/terms`,
   `/size-guide`, `/contact`) — see `NOTES.md`. Still open: these have
   **not had a legal review**, and every support email on them is a
   `@graybridge.example` placeholder needing a real inbox.
7. VPS deployment specifics — OS, process manager (systemd/pm2/Compose),
   reverse proxy + TLS, Postgres backup strategy. Dockerfile/health-check/
   env-template already exist; this is "run it somewhere for real."

## Tier 3 — product/growth features

8. ~~Customer review submission UI.~~ **DONE 2026-08-03** — real `Review`
   model, API, and PDP UI; `Product.rating`/`reviews` are now maintained
   aggregates over real reviews rather than static seed data. A second
   pass added admin moderation (list/search/filter/delete + CSV export),
   a rating-distribution histogram, and helpfulness voting. See
   `NOTES.md` "Customer reviews" and "Reviews, round two".
   **Still open**: customer review *photos* — deferred deliberately, it
   needs an owner decision on abusive-content policy and a real storage
   story, not just code. See the end of "Reviews, round two".
9. Basic analytics/marketing: email capture, abandoned-cart follow-up.
10. Split the app-wide eager catalog fetch (`lib/store.tsx`) into
    summary vs. full-detail before the catalog grows much past ~150
    products — flagged as a scaling concern, not urgent yet.

## Tier 1b — pre-existing bugs found while verifying Tier 2 (2026-08-03)

Both were found by actually loading pages in a browser rather than by
reading code, and both reproduce on pages nobody touched (`/`, `/about`)
— so neither is a regression from this roadmap's work.

13. **The site was not responsive — FIXED 2026-08-03.** See `NOTES.md`
    "Responsive pass" for the full writeup. Zero horizontal overflow now,
    verified at every width from 320px to 1280px across every
    customer-facing page.
14. ~~**React hydration mismatch on every page.**~~ **WITHDRAWN — not a
    real bug.** This was logged off a single observation and did not
    survive investigation; see `NOTES.md` "Hydration mismatch: withdrawn"
    for how it was ruled out. Left here rather than deleted so the same
    symptom isn't re-investigated from scratch later.

## Tier 4 — nice-to-haves

11. Image handling — every image is a plain `<img>`; no `next/image`, so
    no lazy-loading/responsive-sizing/format negotiation.
12. CI wiring — no GitHub remote configured yet, so nothing runs the
    existing test suite automatically on push.

## Working agreement

Going through this iteratively, tier by tier, starting with Tier 1. Each
item gets verified (build + relevant tests) before moving to the next,
consistent with how prior sessions worked per `NOTES.md`.
