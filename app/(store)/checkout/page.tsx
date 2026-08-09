"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { applyDiscount, cartLines, cartTotals } from "@/lib/cart-utils";
import { useStore } from "@/lib/store";
import { s } from "@/lib/style";
import { Hv } from "@/components/Hover";

interface FormState {
  name: string;
  email: string;
  line1: string;
  line2: string;
  city: string;
  region: string;
  postalCode: string;
  country: string;
  phone: string;
}

const blankForm = (): FormState => ({
  name: "",
  email: "",
  line1: "",
  line2: "",
  city: "",
  region: "",
  postalCode: "",
  country: "United States",
  phone: "",
});

const FIELD_STYLE = "border:1px solid #e0d9cc;border-radius:9px;padding:11px 13px;font-size:14px";
const LABEL_STYLE = "font-size:12.5px;font-weight:500;color:#5f5a52";

export default function CheckoutPage() {
  const router = useRouter();
  const { cart, cartHydrated, catalog, clearCart } = useStore();
  const [form, setForm] = useState<FormState>(blankForm());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [discountInput, setDiscountInput] = useState("");
  const [discountChecking, setDiscountChecking] = useState(false);
  const [discountError, setDiscountError] = useState("");
  const [appliedDiscount, setAppliedDiscount] = useState<{ code: string; amount: number } | null>(null);

  const lines = cartLines(cart, catalog);
  const baseTotals = cartTotals(cart, catalog);
  const totals = appliedDiscount ? applyDiscount(baseTotals, appliedDiscount.amount) : baseTotals;

  const applyDiscountCode = async (e?: React.SyntheticEvent) => {
    e?.preventDefault();
    if (!discountInput.trim()) return;
    setDiscountChecking(true);
    setDiscountError("");
    try {
      const res = await fetch(
        `/api/discounts/validate?code=${encodeURIComponent(discountInput.trim())}&subtotal=${baseTotals.subtotal}`,
      );
      const data = await res.json().catch(() => ({}));
      if (!data?.valid) {
        setDiscountError(data?.message || "That code isn't valid.");
        setAppliedDiscount(null);
        return;
      }
      setAppliedDiscount({ code: data.normalizedCode, amount: data.discountAmount });
    } catch {
      setDiscountError("Could not check that code.");
    } finally {
      setDiscountChecking(false);
    }
  };

  const removeDiscountCode = () => {
    setAppliedDiscount(null);
    setDiscountInput("");
    setDiscountError("");
  };

  useEffect(() => {
    // Wait for the cart to finish hydrating from localStorage before
    // trusting an empty cart — otherwise a hard refresh/direct load of
    // /checkout sees the initial empty [] for one tick and bounces to
    // /cart even when the cart actually has items.
    if (cartHydrated && cart.length === 0) router.replace("/cart");
  }, [cartHydrated, cart.length, router]);

  const field = (key: keyof FormState) => ({
    value: form[key],
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, [key]: e.target.value })),
    style: s(FIELD_STYLE),
  });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          address: {
            line1: form.line1,
            line2: form.line2,
            city: form.city,
            region: form.region,
            postalCode: form.postalCode,
            country: form.country,
            phone: form.phone,
          },
          items: cart.map((c) => ({ id: c.id, size: c.size, color: c.color, qty: c.qty })),
          discountCode: appliedDiscount?.code || undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data?.error || "Could not place order.");
        return;
      }
      clearCart();
      router.push(`/checkout/success?order=${encodeURIComponent(data.orderNumber)}`);
    } catch {
      setError("Could not reach the server.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <main style={s("flex:1;max-width:1080px;margin:0 auto;width:100%;padding:40px 28px 70px")}>
      <h1 style={s("font-size:34px;font-weight:600;letter-spacing:-.025em;margin:0 0 28px;animation:gbFade .4s both")}>
        Checkout
      </h1>
      <form onSubmit={submit} className="gb-sidebar-340" style={s("display:grid;gap:40px;align-items:start")}>
        <div style={s("display:flex;flex-direction:column;gap:16px;animation:gbFade .5s both")}>
          <div style={s("background:#fff;border:1px solid #e7e0d3;border-radius:14px;padding:24px;display:flex;flex-direction:column;gap:16px")}>
            <div style={s("font-size:15px;font-weight:600")}>Contact</div>
            <div className="gb-row-2" style={s("display:grid;gap:14px")}>
              <div style={s("display:flex;flex-direction:column;gap:6px")}>
                <label style={s(LABEL_STYLE)}>Full name</label>
                <input {...field("name")} placeholder="Jamie Rivera" required autoComplete="name" />
              </div>
              <div style={s("display:flex;flex-direction:column;gap:6px")}>
                <label style={s(LABEL_STYLE)}>Email</label>
                <input {...field("email")} placeholder="you@example.com" type="email" required autoComplete="email" />
              </div>
            </div>
          </div>

          <div style={s("background:#fff;border:1px solid #e7e0d3;border-radius:14px;padding:24px;display:flex;flex-direction:column;gap:16px")}>
            <div style={s("font-size:15px;font-weight:600")}>Shipping address</div>
            <div style={s("display:flex;flex-direction:column;gap:6px")}>
              <label style={s(LABEL_STYLE)}>Address line 1</label>
              <input {...field("line1")} placeholder="123 Main St" required autoComplete="address-line1" />
            </div>
            <div style={s("display:flex;flex-direction:column;gap:6px")}>
              <label style={s(LABEL_STYLE)}>Address line 2 (optional)</label>
              <input {...field("line2")} placeholder="Apt, suite, etc." autoComplete="address-line2" />
            </div>
            <div className="gb-row-2" style={s("display:grid;gap:14px")}>
              <div style={s("display:flex;flex-direction:column;gap:6px")}>
                <label style={s(LABEL_STYLE)}>City</label>
                <input {...field("city")} placeholder="Pittsburgh" required autoComplete="address-level2" />
              </div>
              <div style={s("display:flex;flex-direction:column;gap:6px")}>
                <label style={s(LABEL_STYLE)}>State / region</label>
                <input {...field("region")} placeholder="PA" required autoComplete="address-level1" />
              </div>
            </div>
            <div className="gb-row-3" style={s("display:grid;gap:14px")}>
              <div style={s("display:flex;flex-direction:column;gap:6px")}>
                <label style={s(LABEL_STYLE)}>Postal code</label>
                <input {...field("postalCode")} placeholder="15222" required autoComplete="postal-code" />
              </div>
              <div style={s("display:flex;flex-direction:column;gap:6px")}>
                <label style={s(LABEL_STYLE)}>Country</label>
                <input {...field("country")} required autoComplete="country-name" />
              </div>
              <div style={s("display:flex;flex-direction:column;gap:6px")}>
                <label style={s(LABEL_STYLE)}>Phone (optional)</label>
                <input {...field("phone")} placeholder="" autoComplete="tel" />
              </div>
            </div>
          </div>

          {error ? (
            <div style={s("font-size:13px;color:#b3402a;background:#f7e6e1;padding:12px 14px;border-radius:9px")}>{error}</div>
          ) : null}
        </div>

        <div
          style={s(
            "background:#fff;border:1px solid #e7e0d3;border-radius:16px;padding:24px;position:sticky;top:90px;animation:gbScale .5s both",
          )}
        >
          <div style={s("font-size:17px;font-weight:600;margin-bottom:16px")}>Order summary</div>
          <div style={s("display:flex;flex-direction:column;gap:12px;max-height:260px;overflow:auto;margin-bottom:16px")}>
            {lines.map((i) => (
              <div key={i.key} style={s("display:flex;justify-content:space-between;gap:10px;font-size:13px")}>
                <span style={s("color:#5f5a52")}>
                  {i.qty} × {i.name}
                </span>
                <span style={s("font:500 12.5px 'Geist Mono',monospace")}>{i.lineStr}</span>
              </div>
            ))}
          </div>

          <div style={s("display:flex;flex-direction:column;gap:8px;border-top:1px solid #eee7db;padding-top:14px;margin-bottom:2px")}>
            {appliedDiscount ? (
              <div style={s("display:flex;justify-content:space-between;align-items:center;font-size:13px")}>
                <span style={s("color:#1f8a5b;font-weight:500")}>Code {appliedDiscount.code} applied</span>
                <span onClick={removeDiscountCode} style={s("color:#9a948a;cursor:pointer;font-size:12.5px")}>
                  Remove
                </span>
              </div>
            ) : (
              <div style={s("display:flex;gap:8px")}>
                <input
                  value={discountInput}
                  onChange={(e) => setDiscountInput(e.target.value)}
                  onKeyDown={(e) => {
                    // This input lives inside the order <form> — Enter
                    // here should apply the code, not submit the order.
                    // (HTML doesn't allow nested <form> elements, so
                    // intercepting the keydown is the way to give it its
                    // own Enter behavior.)
                    if (e.key === "Enter") applyDiscountCode(e);
                  }}
                  placeholder="Discount code"
                  style={s("flex:1;border:1px solid #e0d9cc;border-radius:9px;padding:9px 11px;font-size:13px;min-width:0")}
                />
                <Hv
                  as="button"
                  type="button"
                  onClick={applyDiscountCode}
                  css="background:#fff;color:#1a1714;border:1px solid #e0d9cc;padding:9px 16px;border-radius:9px;font-size:13px;font-weight:500;cursor:pointer;white-space:nowrap"
                  hover="background:#f7f3ea"
                >
                  {discountChecking ? "Checking…" : "Apply"}
                </Hv>
              </div>
            )}
            {discountError ? <div style={s("font-size:12.5px;color:#b3402a")}>{discountError}</div> : null}
          </div>

          <div style={s("display:flex;flex-direction:column;gap:11px;font-size:14px;color:#5f5a52;border-top:1px solid #eee7db;padding-top:14px")}>
            <div style={s("display:flex;justify-content:space-between")}>
              <span>Subtotal</span>
              <span style={s("font:500 13.5px 'Geist Mono',monospace;color:#1a1714")}>{totals.subtotalStr}</span>
            </div>
            {appliedDiscount ? (
              <div style={s("display:flex;justify-content:space-between")}>
                <span>Discount</span>
                <span style={s("font:500 13.5px 'Geist Mono',monospace;color:#1f8a5b")}>
                  -${appliedDiscount.amount.toFixed(2)}
                </span>
              </div>
            ) : null}
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
            type="submit"
            disabled={busy}
            css="width:100%;background:#c2410c;color:#fff;border:none;padding:15px;border-radius:10px;font-size:15px;font-weight:500;cursor:pointer;margin-top:18px;transition:background .25s,transform .2s"
            hover="background:#9a330a;transform:translateY(-1px)"
          >
            {busy ? "Placing order…" : `Place order · ${totals.totalStr}`}
          </Hv>
        </div>
      </form>
    </main>
  );
}
