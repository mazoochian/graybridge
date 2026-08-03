import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    setupFiles: ["./tests/setup.ts"],
    testTimeout: 15000,
    hookTimeout: 20000,
    // Integration tests share one Postgres test database (see .env.test).
    // Keeping file execution sequential avoids cross-file interference
    // without needing per-test transactional isolation.
    fileParallelism: false,
  },
  resolve: {
    alias: {
      "@": new URL(".", import.meta.url).pathname,
    },
  },
});
