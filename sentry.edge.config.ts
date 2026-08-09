import * as Sentry from "@sentry/nextjs";

// Covers edge-runtime routes/middleware if any are ever added. No-op
// until SENTRY_DSN is set — see sentry.server.config.ts.
Sentry.init({
  dsn: process.env.SENTRY_DSN,
  enabled: !!process.env.SENTRY_DSN,
  tracesSampleRate: 0.1,
});
