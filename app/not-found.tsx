"use client";

import Link from "next/link";

// Root-level fallback for routes outside the (store) group (which has its
// own richer not-found.tsx with site chrome) — e.g. a mistyped top-level
// URL. Deliberately dependency-free (no useStore/context) so it still
// renders even if something upstream is broken.
export default function RootNotFound() {
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
        <span style={{ font: "500 12px 'Geist Mono',monospace", letterSpacing: ".18em", color: "#c2410c" }}>404</span>
        <h1 style={{ fontSize: 32, lineHeight: 1.15, letterSpacing: "-.02em", fontWeight: 600, margin: 0 }}>Page not found.</h1>
        <p style={{ fontSize: 15.5, lineHeight: 1.6, color: "#5f5a52", margin: 0 }}>
          That page doesn&apos;t exist. Head back to the storefront.
        </p>
        <Link
          href="/"
          style={{
            background: "#c2410c",
            color: "#fff",
            border: "none",
            padding: "12px 22px",
            borderRadius: 9,
            fontSize: 14.5,
            fontWeight: 500,
            textDecoration: "none",
            marginTop: 8,
          }}
        >
          Go home
        </Link>
      </div>
    </div>
  );
}
