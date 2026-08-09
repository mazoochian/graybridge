import * as Sentry from "@sentry/nextjs";

// Client-side counterpart to sentry.server.config.ts. Uses a NEXT_PUBLIC_
// var (not SENTRY_DSN) because this file ships inside the browser bundle —
// Sentry DSNs are meant to be public (they only allow submitting events,
// not reading data), but keeping the var name distinct makes that
// intentional rather than accidental.
Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  enabled: !!process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 0.1,
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
