import path from "node:path";
import { config } from "dotenv";

// Point the app at the dedicated test database/secret (see .env.test)
// before any test file imports lib/prisma.ts or lib/auth.ts, both of
// which read process.env at module-load time.
config({ path: path.resolve(__dirname, "../.env.test"), override: true });

if (!process.env.DATABASE_URL?.includes("graybridge_test")) {
  throw new Error(
    "Refusing to run tests: DATABASE_URL does not point at graybridge_test. " +
      "Check .env.test — tests must never run against the dev/prod database.",
  );
}
