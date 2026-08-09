import * as Sentry from "@sentry/nextjs";

// No-op until SENTRY_DSN is set, same pattern as lib/payment.ts/lib/mail.ts:
// isolated behind an env var, real behavior arrives with no code change.
Sentry.init({
  dsn: process.env.SENTRY_DSN,
  enabled: !!process.env.SENTRY_DSN,
  tracesSampleRate: 0.1,
});
