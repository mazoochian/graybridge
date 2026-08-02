"use client";

import { useRouter } from "next/navigation";
import { cartLines, cartTotals } from "@/lib/cart-utils";
import { useStore } from "@/lib/store";
import { s } from "@/lib/style";
import { Hv } from "./Hover";

export function CartDrawer() {
  const router = useRouter();
  const { cart, catalog, cartOpen, cartCount, closeCart, changeQty } = useStore();
  if (!cartOpen) return null;

  const lines = cartLines(cart, catalog);
  const totals = cartTotals(cart, catalog);
  const empty = cart.length === 0;

  return (
    <>
      <div
        onClick={closeCart}
        style={s("position:fixed;inset:0;background:rgba(20,15,10,.4);z-index:60;animation:gbFadeIn .3s both")}
      />
      <div
        style={s(
          "position:fixed;top:0;right:0;bottom:0;width:400px;max-width:92vw;background:#faf8f4;z-index:61;display:flex;flex-direction:column;box-shadow:-20px 0 60px -30px rgba(0,0,0,.5);animation:gbDrawer .35s cubic-bezier(.2,.8,.2,1) both",
        )}
      >
        <div
          style={s(
            "display:flex;justify-content:space-between;align-items:center;padding:20px 22px;border-bottom:1px solid #e7e0d3",
          )}
        >
          <span style={s("font-size:17px;font-weight:600")}>Your bag · {cartCount}</span>
          <span onClick={closeCart} style={s("font-size:22px;cursor:pointer;color:#8a8275;line-height:1")}>
            ×
          </span>
        </div>

        {empty ? (
          <div
            style={s(
              "flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;padding:30px;color:#8a8275",
            )}
          >
            <div style={s("font-size:15px;color:#1a1714;font-weight:500")}>Your bag is empty</div>
            <button
              onClick={closeCart}
              style={s(
                "background:#1a1714;color:#fff;border:none;padding:12px 22px;border-radius:9px;font-size:14px;cursor:pointer",
              )}
            >
              Keep shopping
            </button>
          </div>
        ) : (
          <>
            <div style={s("flex:1;overflow:auto;padding:8px 22px")}>
              {lines.map((i) => (
                <div key={i.key} style={s("display:flex;gap:14px;padding:16px 0;border-bottom:1px solid #ece6da")}>
                  <div style={s("width:64px;height:80px;border-radius:9px;overflow:hidden;background:#f1ece2;flex-shrink:0")}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={i.img} alt={i.name} style={s("width:100%;height:100%;object-fit:cover")} />
                  </div>
                  <div style={s("flex:1;display:flex;flex-direction:column;gap:4px")}>
                    <div style={s("font-size:14px;font-weight:500")}>{i.name}</div>
                    <div style={s("font:400 11px 'Geist Mono',monospace;color:#9a948a")}>{i.meta}</div>
                    <div style={s("display:flex;justify-content:space-between;align-items:center;margin-top:auto")}>
                      <div style={s("display:flex;align-items:center;border:1px solid #e0d9cc;border-radius:7px;background:#fff")}>
                        <span
                          onClick={() => changeQty(i.key, -1)}
                          style={s("padding:3px 9px;cursor:pointer;color:#6b6459;user-select:none")}
                        >
                          −
                        </span>
                        <span style={s("min-width:20px;text-align:center;font:500 12px 'Geist Mono',monospace")}>
                          {i.qty}
                        </span>
                        <span
                          onClick={() => changeQty(i.key, 1)}
                          style={s("padding:3px 9px;cursor:pointer;color:#6b6459;user-select:none")}
                        >
                          +
                        </span>
                      </div>
                      <span style={s("font:500 13px 'Geist Mono',monospace")}>{i.lineStr}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div style={s("border-top:1px solid #e7e0d3;padding:20px 22px;display:flex;flex-direction:column;gap:14px")}>
              <div style={s("display:flex;justify-content:space-between;font-size:15px;font-weight:600")}>
                <span>Subtotal</span>
                <span style={s("font-family:'Geist Mono',monospace")}>{totals.subtotalStr}</span>
              </div>
              <div style={s("font-size:11.5px;color:#9a948a;text-align:center")}>{totals.freeShipNote}</div>
              <Hv
                as="button"
                onClick={() => {
                  closeCart();
                  router.push("/cart");
                }}
                css="background:#c2410c;color:#fff;border:none;padding:14px;border-radius:10px;font-size:15px;font-weight:500;cursor:pointer;transition:background .25s"
                hover="background:#9a330a"
              >
                Checkout
              </Hv>
            </div>
          </>
        )}
      </div>
    </>
  );
}
