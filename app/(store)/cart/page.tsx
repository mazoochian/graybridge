"use client";

import { useRouter } from "next/navigation";
import { cartLines, cartTotals } from "@/lib/cart-utils";
import { useStore } from "@/lib/store";
import { s } from "@/lib/style";
import { Hv } from "@/components/Hover";

export default function CartPage() {
  const router = useRouter();
  const { cart, catalog, changeQty, removeItem } = useStore();

  const lines = cartLines(cart, catalog);
  const totals = cartTotals(cart, catalog);

  return (
    <main style={s("flex:1;max-width:1080px;margin:0 auto;width:100%;padding:40px 28px 70px")}>
      <h1 style={s("font-size:34px;font-weight:600;letter-spacing:-.025em;margin:0 0 28px;animation:gbFade .4s both")}>
        Your bag
      </h1>

      {cart.length === 0 ? (
        <div style={s("text-align:center;padding:70px 20px;color:#8a8275;animation:gbFade .4s both")}>
          <div style={s("font-size:19px;font-weight:500;color:#1a1714;margin-bottom:8px")}>Your bag is empty</div>
          <div style={s("font-size:14.5px;margin-bottom:22px")}>Find something you&apos;ll wear for years.</div>
          <button
            onClick={() => router.push("/shop")}
            style={s(
              "background:#1a1714;color:#fff;border:none;padding:14px 26px;border-radius:10px;font-size:14.5px;font-weight:500;cursor:pointer",
            )}
          >
            Start shopping
          </button>
        </div>
      ) : (
        <div style={s("display:grid;grid-template-columns:1fr 340px;gap:40px;align-items:start")}>
          <div style={s("display:flex;flex-direction:column;animation:gbFade .5s both")}>
            {lines.map((i) => (
              <div key={i.key} style={s("display:flex;gap:18px;padding:20px 0;border-bottom:1px solid #e7e0d3")}>
                <div
                  onClick={() => router.push("/product/" + i.id)}
                  style={s("width:92px;height:114px;border-radius:11px;overflow:hidden;background:#f1ece2;flex-shrink:0;cursor:pointer")}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={i.img} alt={i.name} style={s("width:100%;height:100%;object-fit:cover")} />
                </div>
                <div style={s("flex:1;display:flex;flex-direction:column;gap:6px")}>
                  <div style={s("display:flex;justify-content:space-between;gap:12px")}>
                    <div>
                      <div style={s("font-size:15px;font-weight:500")}>{i.name}</div>
                      <div style={s("font:400 12px 'Geist Mono',monospace;color:#9a948a;margin-top:3px")}>{i.meta}</div>
                    </div>
                    <div style={s("font:500 14.5px 'Geist Mono',monospace")}>{i.lineStr}</div>
                  </div>
                  <div style={s("display:flex;justify-content:space-between;align-items:center;margin-top:auto")}>
                    <div style={s("display:flex;align-items:center;border:1px solid #e0d9cc;border-radius:8px;background:#fff")}>
                      <span
                        onClick={() => changeQty(i.key, -1)}
                        style={s("padding:5px 12px;cursor:pointer;color:#6b6459;font-size:16px;user-select:none")}
                      >
                        −
                      </span>
                      <span style={s("min-width:24px;text-align:center;font:500 13px 'Geist Mono',monospace")}>{i.qty}</span>
                      <span
                        onClick={() => changeQty(i.key, 1)}
                        style={s("padding:5px 12px;cursor:pointer;color:#6b6459;font-size:16px;user-select:none")}
                      >
                        +
                      </span>
                    </div>
                    <span
                      onClick={() => removeItem(i.key)}
                      style={s("font-size:12.5px;color:#9a948a;cursor:pointer;border-bottom:1px solid #d6cfc2")}
                    >
                      Remove
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div
            style={s(
              "background:#fff;border:1px solid #e7e0d3;border-radius:16px;padding:24px;position:sticky;top:90px;animation:gbScale .5s both",
            )}
          >
            <div style={s("font-size:17px;font-weight:600;margin-bottom:18px")}>Order summary</div>
            <div style={s("display:flex;flex-direction:column;gap:11px;font-size:14px;color:#5f5a52")}>
              <div style={s("display:flex;justify-content:space-between")}>
                <span>Subtotal</span>
                <span style={s("font:500 13.5px 'Geist Mono',monospace;color:#1a1714")}>{totals.subtotalStr}</span>
              </div>
              <div style={s("display:flex;justify-content:space-between")}>
                <span>Shipping</span>
                <span style={s("font:500 13.5px 'Geist Mono',monospace;color:#1a1714")}>{totals.shipStr}</span>
              </div>
              <div style={s("display:flex;justify-content:space-between")}>
                <span>Estimated tax</span>
                <span style={s("font:500 13.5px 'Geist Mono',monospace;color:#1a1714")}>{totals.taxStr}</span>
              </div>
            </div>
            <div
              style={s(
                "display:flex;justify-content:space-between;border-top:1px solid #e7e0d3;margin-top:16px;padding-top:16px;font-size:16px;font-weight:600",
              )}
            >
              <span>Total</span>
              <span style={s("font-family:'Geist Mono',monospace")}>{totals.totalStr}</span>
            </div>
            <Hv
              as="button"
              onClick={() => router.push("/checkout")}
              css="width:100%;background:#c2410c;color:#fff;border:none;padding:15px;border-radius:10px;font-size:15px;font-weight:500;cursor:pointer;margin-top:18px;transition:background .25s,transform .2s"
              hover="background:#9a330a;transform:translateY(-1px)"
            >
              Checkout · {totals.totalStr}
            </Hv>
            <div style={s("font-size:11.5px;color:#9a948a;text-align:center;margin-top:12px")}>{totals.freeShipNote}</div>
            {/* Payment brand marks removed here — still test-mode-only,
                see components/Footer.tsx for the full explanation. */}
          </div>
        </div>
      )}
    </main>
  );
}
