"use client";

import { useRouter } from "next/navigation";
import { s } from "@/lib/style";

export function Footer() {
  const router = useRouter();
  const go = (href: string) => () => router.push(href);

  return (
    <footer style={s("background:#1a1714;color:#cbc4b8;margin-top:60px")}>
      <div style={s("max-width:1280px;margin:0 auto;padding:52px 28px 30px")}>
        <div style={s("display:flex;justify-content:space-between;flex-wrap:wrap;gap:36px")}>
          <div style={s("max-width:280px;display:flex;flex-direction:column;gap:14px")}>
            <div style={s("font-size:22px;font-weight:600;color:#fff;letter-spacing:-.02em")}>
              graybridge<span style={s("color:#c2410c")}>.</span>
            </div>
            <p style={s("font-size:13.5px;line-height:1.6;color:#9a948a;margin:0")}>
              Honest, durable everyday clothing — designed and finished in Pittsburgh, Pennsylvania.
            </p>
            {/* Payment brand marks (Visa/Mastercard/Amex/PayPal/Apple/Google
                Pay) were removed here — the store is still in payment
                test-mode (lib/payment.ts always "succeeds", no real
                processor wired up) and showing those logos implied
                real payment support that doesn't exist yet. Re-add once a
                real processor is connected. */}
          </div>
          <div style={s("display:flex;gap:60px;flex-wrap:wrap;font-size:13.5px;line-height:2.1")}>
            <div>
              <div style={s("color:#fff;font-weight:500;margin-bottom:6px")}>Shop</div>
              <div onClick={go("/shop?cat=All&tag=New")} style={s("cursor:pointer")}>
                New arrivals
              </div>
              <div onClick={go("/shop?cat=Knitwear")} style={s("cursor:pointer")}>
                Knitwear
              </div>
              <div onClick={go("/shop?cat=Denim")} style={s("cursor:pointer")}>
                Denim
              </div>
              <div onClick={go("/shop?cat=Outerwear")} style={s("cursor:pointer")}>
                Outerwear
              </div>
            </div>
            <div>
              <div style={s("color:#fff;font-weight:500;margin-bottom:6px")}>Company</div>
              <div onClick={go("/about")} style={s("cursor:pointer")}>
                About us
              </div>
              {/* Journal/Stores/Careers were listed here but no such pages
                  exist — removed rather than left as dead text. Re-add
                  alongside the real page. */}
              <div onClick={go("/contact")} style={s("cursor:pointer")}>
                Contact
              </div>
            </div>
            <div>
              <div style={s("color:#fff;font-weight:500;margin-bottom:6px")}>Help</div>
              <div onClick={go("/shipping")} style={s("cursor:pointer")}>
                Shipping
              </div>
              <div onClick={go("/returns")} style={s("cursor:pointer")}>
                Returns
              </div>
              <div onClick={go("/size-guide")} style={s("cursor:pointer")}>
                Size guide
              </div>
              <div onClick={go("/contact")} style={s("cursor:pointer")}>
                Contact
              </div>
            </div>
          </div>
        </div>
        <div
          style={s(
            "display:flex;justify-content:space-between;align-items:center;border-top:1px solid #34302a;margin-top:36px;padding-top:22px;flex-wrap:wrap;gap:12px",
          )}
        >
          <span style={s("font:400 11.5px 'Geist Mono',monospace;color:#7d766b")}>
            © 2026 Graybridge Supply Co. · 2231 Penn Avenue, Pittsburgh, PA
          </span>
          <div style={s("display:flex;gap:20px;font-size:12.5px;color:#9a948a")}>
            <span onClick={go("/privacy")} style={s("cursor:pointer")}>
              Privacy
            </span>
            <span onClick={go("/terms")} style={s("cursor:pointer")}>
              Terms
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
