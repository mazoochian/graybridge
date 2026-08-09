import { defineConfig } from "@playwright/test";
import { config as loadEnv } from "dotenv";

// Specs that assert on whole-product aggregates need to reset that
// product's rows first (see tests/e2e/product-reviews.spec.ts), which
// means the *test* process — not just the dev server it drives — needs
// DATABASE_URL. Next loads .env for the server automatically; nothing
// loads it for Playwright itself, so do it here. This deliberately
// points at the dev database, the same one the webServer below uses.
loadEnv({ path: ".env" });

const PORT = 3100;

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 30_000,
  fullyParallel: false, // e2e specs share the dev Postgres DB; keep them sequential
  workers: 1,
  // `next dev`'s Fast Refresh occasionally performs a full page reload as
  // a fallback (visible in the dev server log: "Fast Refresh had to
  // perform a full reload") — confirmed via testing that this is an
  // inherent `next dev` behavior (reproduces with both Turbopack and
  // --webpack), not specific to any app code. It only affects dev-mode
  // e2e runs: a hard reload destroys any pending client-side timer
  // (e.g. a debounced save), which no implementation of that timer can
  // survive by definition, and it never happens in a production build.
  // One retry absorbs this rather than chasing an inherently
  // environmental, non-deterministic source of flakiness.
  retries: 1,
  reporter: [["list"]],
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "retain-on-failure",
  },
  webServer: {
    command: `npm run dev -- -p ${PORT}`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: true,
    timeout: 60_000,
  },
});
