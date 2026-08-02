"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useStore } from "@/lib/store";
import { s } from "@/lib/style";
import { Hv } from "./Hover";

export function Header() {
  const router = useRouter();
  const { cartCount, openCart, customer } = useStore();
  const [q, setQ] = useState("");
  const nav = (href: string) => router.push(href);

  const link = (label: string, href: string) => (
    <Hv as="span" onClick={() => nav(href)} css="cursor:pointer;transition:color .2s" hover="color:#c2410c">
      {label}
    </Hv>
  );

  return (
    <>
      <div
        style={s(
          "background:#1a1714;color:#e9e3d8;text-align:center;font:400 11.5px 'Geist Mono',monospace;letter-spacing:.08em;padding:9px 16px",
        )}
      >
        FREE SHIPPING OVER $75 · 30-DAY RETURNS · SMALL-BATCH GOODS FROM PITTSBURGH
      </div>
      <header
        style={s(
          "position:sticky;top:0;z-index:40;background:rgba(250,248,244,.86);backdrop-filter:blur(14px);border-bottom:1px solid #e7e0d3",
        )}
      >
        <div
          style={s(
            "max-width:1280px;margin:0 auto;display:flex;align-items:center;justify-content:space-between;padding:16px 28px;gap:24px",
          )}
        >
          <div
            onClick={() => nav("/")}
            style={s("font-size:22px;font-weight:600;letter-spacing:-.03em;cursor:pointer;flex-shrink:0")}
          >
            graybridge<span style={s("color:#c2410c")}>.</span>
          </div>
          <nav style={s("display:flex;gap:26px;font-size:14.5px;color:#2f2a24")}>
            {link("New", "/shop?cat=All&tag=New")}
            {link("Shop All", "/shop")}
            {link("Knitwear", "/shop?cat=Knitwear")}
            {link("Denim", "/shop?cat=Denim")}
            {link("Outerwear", "/shop?cat=Outerwear")}
            {link("About", "/about")}
          </nav>
          <div style={s("display:flex;align-items:center;gap:16px;flex-shrink:0")}>
            <div
              className="gb-focus"
              style={s(
                "display:flex;align-items:center;gap:8px;background:#fff;border:1px solid #e7e0d3;border-radius:999px;padding:8px 14px;width:210px;transition:border-color .2s",
              )}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#9a9388" strokeWidth="2">
                <circle cx="11" cy="11" r="7" />
                <line x1="21" y1="21" x2="16.5" y2="16.5" />
              </svg>
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") nav("/shop?q=" + encodeURIComponent(q));
                }}
                placeholder="Search the shop"
                style={s("border:none;background:transparent;font-size:13.5px;width:100%;color:#1a1714")}
              />
            </div>
            <Hv
              as="span"
              onClick={() => nav(customer ? "/account" : "/account/login")}
              title={customer ? `Account · ${customer.name}` : "Sign in"}
              css="cursor:pointer;display:flex"
              hover="opacity:.6"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#1a1714" strokeWidth="1.7">
                <circle cx="12" cy="8" r="3.5" />
                <path d="M5 20c0-3.5 3-6 7-6s7 2.5 7 6" />
              </svg>
            </Hv>
            <Hv
              onClick={openCart}
              css="position:relative;cursor:pointer;display:flex;align-items:center"
              hover="opacity:.6"
            >
              <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="#1a1714" strokeWidth="1.7">
                <path d="M6 8h12l-1.2 12H7.2L6 8z" />
                <path d="M9 8a3 3 0 0 1 6 0" />
              </svg>
              {cartCount > 0 ? (
                <span
                  style={s(
                    "position:absolute;top:-7px;right:-9px;background:#c2410c;color:#fff;font:600 10px 'Geist Mono',monospace;min-width:17px;height:17px;border-radius:999px;display:flex;align-items:center;justify-content:center;padding:0 4px",
                  )}
                >
                  {cartCount}
                </span>
              ) : null}
            </Hv>
          </div>
        </div>
      </header>
    </>
  );
}
