"use client";

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";

// Catches errors thrown by the root layout itself (app/layout.tsx),
// which app/error.tsx cannot do — Next.js requires this file to render
// its own <html>/<body> since it replaces the root layout entirely when
// triggered. Kept maximally simple/dependency-free on purpose: if the
// root layout is broken, this needs to still work.
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("[global error boundary]", error);
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="en">
      <body>
        <div
          style={{
            minHeight: "100vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "80px 28px",
            fontFamily: "system-ui, sans-serif",
            color: "#1a1714",
            background: "#faf8f4",
          }}
        >
          <div style={{ maxWidth: 460, textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: 18 }}>
            <span style={{ font: "500 12px 'Geist Mono',monospace", letterSpacing: ".18em", color: "#c2410c" }}>CRITICAL ERROR</span>
            <h1 style={{ fontSize: 30, lineHeight: 1.15, letterSpacing: "-.02em", fontWeight: 600, margin: 0 }}>
              The app failed to load.
            </h1>
            <p style={{ fontSize: 15.5, lineHeight: 1.6, color: "#5f5a52", margin: 0 }}>
              Please refresh the page. If this keeps happening, come back later.
            </p>
            <button
              onClick={reset}
              style={{
                background: "#c2410c",
                color: "#fff",
                border: "none",
                padding: "12px 22px",
                borderRadius: 9,
                fontSize: 14.5,
                fontWeight: 500,
                cursor: "pointer",
                marginTop: 8,
              }}
            >
              Try again
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
