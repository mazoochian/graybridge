import type { ReactNode } from "react";
import { s } from "@/lib/style";

/**
 * Shared shell for the static policy/help pages (shipping, returns,
 * privacy, terms, size guide, contact). Server component — these pages
 * are pure prose with no interactivity, so they prerender statically.
 */
export function PolicyPage({
  eyebrow,
  title,
  intro,
  updated,
  children,
}: {
  eyebrow: string;
  title: string;
  intro: string;
  updated?: string;
  children: ReactNode;
}) {
  return (
    <main style={s("flex:1")}>
      <section
        style={s(
          "max-width:760px;margin:0 auto;padding:70px 28px 30px;display:flex;flex-direction:column;gap:18px;animation:gbFade .6s both",
        )}
      >
        <span style={s("font:500 12px 'Geist Mono',monospace;letter-spacing:.18em;color:#c2410c")}>{eyebrow}</span>
        <h1 style={s("font-size:clamp(28px,8vw,42px);line-height:1.08;letter-spacing:-.03em;font-weight:600;margin:0")}>{title}</h1>
        <p style={s("font-size:17px;line-height:1.6;color:#5f5a52;margin:0")}>{intro}</p>
        {updated ? (
          <span style={s("font:400 12px 'Geist Mono',monospace;color:#9a948a")}>LAST UPDATED {updated}</span>
        ) : null}
      </section>
      <section style={s("max-width:760px;margin:0 auto;padding:20px 28px 80px;display:flex;flex-direction:column;gap:34px")}>
        {children}
      </section>
    </main>
  );
}

export function PolicySection({ heading, children }: { heading: string; children: ReactNode }) {
  return (
    <div style={s("display:flex;flex-direction:column;gap:12px")}>
      <h2 style={s("font-size:21px;letter-spacing:-.01em;font-weight:600;margin:0")}>{heading}</h2>
      {children}
    </div>
  );
}

export function P({ children }: { children: ReactNode }) {
  return <p style={s("font-size:15.5px;line-height:1.7;color:#5f5a52;margin:0")}>{children}</p>;
}

export function Bullets({ items }: { items: ReactNode[] }) {
  return (
    <ul style={s("margin:0;padding-left:20px;display:flex;flex-direction:column;gap:8px")}>
      {items.map((item, i) => (
        <li key={i} style={s("font-size:15.5px;line-height:1.7;color:#5f5a52")}>
          {item}
        </li>
      ))}
    </ul>
  );
}
