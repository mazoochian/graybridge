#!/usr/bin/env node
// This runs as its own plain `node` process, separate from Next.js, so
// it does NOT get Next's built-in .env loading for free — replicate just
// enough of it here (.env, then .env.local overriding) so local dev
// (secrets in .env) is checked accurately. In production/Docker the real
// values are normally provided directly via the process environment
// (Docker/systemd/etc) with no .env file present at all — the `dotenv`
// package itself is a devDependency-adjacent transitive dep and isn't
// guaranteed to exist in a production install (e.g. the Docker image's
// pruned/standalone output), so loading it is best-effort and silently
// skipped if unavailable, rather than crashing this check before it even
// runs.
try {
  const { config } = await import("dotenv");
  config();
  config({ path: ".env.local", override: true });
} catch {
  /* dotenv not installed — fine, assume real env vars are already set */
}

// Fails fast, before the Next.js server starts, if required env vars are
// missing — instead of the previous behavior where AUTH_SECRET/
// DATABASE_URL were only checked lazily the first time some request
// handler happened to touch lib/auth.ts, lib/customer-auth.ts, or
// lib/prisma.ts, so a misconfigured deploy could "start up fine" and
// only fail once a real user hit an affected endpoint.
//
// Deliberately a plain pre-start script rather than Next's
// instrumentation.ts `register()` hook: on the pinned Next 14.2.35, a
// thrown error inside `register()` is silently swallowed — the server
// still reports "Ready" and serves requests — so it doesn't actually
// fail fast. This script is wired into `npm run dev` / `npm start` in
// package.json (`node scripts/check-env.mjs && next dev|start`) instead,
// which reliably blocks startup via a non-zero exit code and works the
// same regardless of Next.js version or which process manager runs it.
//
// Not run before `next build` on purpose — a build step (e.g. in a
// Docker image or CI) commonly doesn't have runtime secrets available
// and shouldn't need them; only actually starting the server does.

const required = ["DATABASE_URL", "AUTH_SECRET"];
const missing = required.filter((key) => !process.env[key]);

if (missing.length) {
  console.error(
    `\nMissing required environment variable(s): ${missing.join(", ")}.\n` +
      `Set them before starting the server — see .env.production.template ` +
      `(production) or .env (local dev).\n`,
  );
  process.exit(1);
}
