"use client";

import { useEffect } from "react";

// Root-level error boundary for anything outside the (store) group (which
// has its own richer error.tsx with site chrome). Dependency-free by
// design — an error boundary that itself depends on app context is a
// liability if that context is what broke.
export default function RootError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("[root error boundary]", error);
  }, [error]);

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "80px 28px",
        fontFamily: "system-ui, sans-serif",
        color: "#1a1714",
      }}
    >
      <div style={{ maxWidth: 460, textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: 18 }}>
        <span style={{ font: "500 12px 'Geist Mono',monospace", letterSpacing: ".18em", color: "#c2410c" }}>ERROR</span>
        <h1 style={{ fontSize: 30, lineHeight: 1.15, letterSpacing: "-.02em", fontWeight: 600, margin: 0 }}>Something went wrong.</h1>
        <p style={{ fontSize: 15.5, lineHeight: 1.6, color: "#5f5a52", margin: 0 }}>Please try again.</p>
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
  );
}
