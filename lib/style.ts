import type { CSSProperties } from "react";

/**
 * Parse a CSS declaration string ("background:#c2410c;color:#fff") into a React
 * style object. Lets us carry the design's inline style strings over verbatim,
 * which keeps the implementation faithful and easy to diff against the source.
 */
export function s(css: string): CSSProperties {
  const out: Record<string, string> = {};
  for (const decl of css.split(";")) {
    const idx = decl.indexOf(":");
    if (idx < 0) continue;
    const prop = decl.slice(0, idx).trim();
    const val = decl.slice(idx + 1).trim();
    if (!prop) continue;
    const key = prop.startsWith("--")
      ? prop
      : prop.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase());
    out[key] = val;
  }
  return out as CSSProperties;
}
