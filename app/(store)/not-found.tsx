"use client";

import { useRouter } from "next/navigation";
import { s } from "@/lib/style";
import { Hv } from "@/components/Hover";

export default function StoreNotFound() {
  const router = useRouter();

  return (
    <main style={s("flex:1;display:flex;align-items:center;justify-content:center;padding:80px 28px")}>
      <div style={s("max-width:460px;text-align:center;display:flex;flex-direction:column;align-items:center;gap:18px;animation:gbFade .5s both")}>
        <span style={s("font:500 12px 'Geist Mono',monospace;letter-spacing:.18em;color:#c2410c")}>404</span>
        <h1 style={s("font-size:34px;line-height:1.1;letter-spacing:-.02em;font-weight:600;margin:0")}>
          We couldn&apos;t find that page.
        </h1>
        <p style={s("font-size:15.5px;line-height:1.6;color:#5f5a52;margin:0")}>
          The item or page you&apos;re looking for may have been moved, sold out for good, or never existed.
        </p>
        <div style={s("display:flex;gap:12px;margin-top:8px")}>
          <Hv
            as="button"
            onClick={() => router.push("/shop")}
            css="background:#c2410c;color:#fff;border:none;padding:12px 22px;border-radius:9px;font-size:14.5px;font-weight:500;cursor:pointer;transition:background .25s"
            hover="background:#9a330a"
          >
            Continue shopping
          </Hv>
          <Hv
            as="button"
            onClick={() => router.push("/")}
            css="background:#fff;color:#1a1714;border:1px solid #e0d9cc;padding:12px 22px;border-radius:9px;font-size:14.5px;font-weight:500;cursor:pointer"
            hover="background:#f7f3ea"
          >
            Go home
          </Hv>
        </div>
      </div>
    </main>
  );
}
