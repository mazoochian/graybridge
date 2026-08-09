"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { img } from "@/lib/catalog";
import { useStore } from "@/lib/store";
import { s } from "@/lib/style";
import { Hv } from "@/components/Hover";

type Tab = "orders" | "addresses" | "wishlist";

interface AccountOrder {
  id: number;
  orderNumber: string;
  itemCount: number;
  total: number;
  status: string;
  createdAt: string;
}

interface AddressRow {
  id: number;
  label: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  region: string;
  postalCode: string;
  country: string;
  phone: string;
  isDefault: boolean;
}

interface WishlistRow {
  productId: number;
  product: { id: number; name: string; price: number; imgId: string } | null;
}

const money = (n: number) => "$" + n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const FIELD_STYLE = "border:1px solid #e0d9cc;border-radius:9px;padding:10px 12px;font-size:13.5px";
const CARD_STYLE = "background:#fff;border:1px solid #e7e0d3;border-radius:14px;padding:22px";

const blankAddress = () => ({
  label: "",
  addressLine1: "",
  addressLine2: "",
  city: "",
  region: "",
  postalCode: "",
  country: "United States",
  phone: "",
  isDefault: false,
});

export default function AccountPage() {
  const router = useRouter();
  const { customer, customerChecked, refreshCustomer } = useStore();
  const [tab, setTab] = useState<Tab>("orders");

  const [orders, setOrders] = useState<AccountOrder[]>([]);
  const [addresses, setAddresses] = useState<AddressRow[]>([]);
  const [wishlist, setWishlist] = useState<WishlistRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [newAddress, setNewAddress] = useState(blankAddress());
  const [addingAddress, setAddingAddress] = useState(false);

  useEffect(() => {
    if (customerChecked && !customer) router.replace("/account/login");
  }, [customerChecked, customer, router]);

  useEffect(() => {
    if (!customer) return;
    const controller = new AbortController();
    setLoading(true);
    setLoadError(false);
    const path = tab === "orders" ? "/api/account/orders" : tab === "addresses" ? "/api/account/addresses" : "/api/account/wishlist";
    fetch(path, { signal: controller.signal })
      .then((r) => {
        if (!r.ok) throw new Error(`${path} failed: ${r.status}`);
        return r.json();
      })
      .then((d) => {
        if (tab === "orders") setOrders(d?.orders ?? []);
        else if (tab === "addresses") setAddresses(Array.isArray(d) ? d : []);
        else setWishlist(d?.items ?? []);
      })
      .catch((e) => {
        if (e?.name !== "AbortError") setLoadError(true);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [tab, customer, retryCount]);

  const signOut = async () => {
    await fetch("/api/account/logout", { method: "POST" });
    await refreshCustomer();
    router.push("/");
  };

  const saveAddress = async () => {
    setAddingAddress(true);
    try {
      const res = await fetch("/api/account/addresses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newAddress),
      });
      if (res.ok) {
        const created = await res.json();
        setAddresses((prev) => (created.isDefault ? [created, ...prev.map((a) => ({ ...a, isDefault: false }))] : [...prev, created]));
        setNewAddress(blankAddress());
      }
    } finally {
      setAddingAddress(false);
    }
  };

  const removeAddress = async (id: number) => {
    setAddresses((prev) => prev.filter((a) => a.id !== id));
    await fetch(`/api/account/addresses/${id}`, { method: "DELETE" });
  };

  const makeDefault = async (id: number) => {
    setAddresses((prev) => prev.map((a) => ({ ...a, isDefault: a.id === id })));
    await fetch(`/api/account/addresses/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isDefault: true }),
    });
  };

  const removeWishlistItem = async (productId: number) => {
    setWishlist((prev) => prev.filter((w) => w.productId !== productId));
    await fetch(`/api/account/wishlist/${productId}`, { method: "DELETE" });
  };

  if (!customerChecked || !customer) return null;

  return (
    <main style={s("flex:1;max-width:1000px;margin:0 auto;width:100%;padding:40px 28px 70px")}>
      <div style={s("display:flex;justify-content:space-between;align-items:center;margin-bottom:24px")}>
        <div>
          <h1 style={s("font-size:30px;font-weight:600;letter-spacing:-.02em;margin:0")}>My account</h1>
          <p style={s("font-size:13.5px;color:#8a8275;margin:5px 0 0")}>{customer.name} · {customer.email}</p>
        </div>
        <span onClick={signOut} style={s("font-size:13px;color:#9a948a;cursor:pointer;border-bottom:1px solid #d6cfc2")}>
          Sign out
        </span>
      </div>

      <div style={s("display:flex;gap:10px;margin-bottom:22px")}>
        {(["orders", "addresses", "wishlist"] as Tab[]).map((t) => (
          <div
            key={t}
            onClick={() => setTab(t)}
            style={s(
              `padding:9px 16px;border-radius:999px;cursor:pointer;font-size:13.5px;font-weight:500;text-transform:capitalize;background:${
                tab === t ? "#1a1714" : "#fff"
              };color:${tab === t ? "#fff" : "#5f5a52"};border:1px solid ${tab === t ? "#1a1714" : "#e7e0d3"}`,
            )}
          >
            {t}
          </div>
        ))}
      </div>

      {loading ? <div style={s("color:#8a8275;font-size:13.5px")}>Loading…</div> : null}

      {!loading && loadError ? (
        <div style={s(`${CARD_STYLE};display:flex;flex-direction:column;align-items:flex-start;gap:12px`)}>
          <div style={s("color:#b3402a;font-size:13.5px")}>Couldn&apos;t load this — check your connection and try again.</div>
          <button
            onClick={() => setRetryCount((n) => n + 1)}
            style={s("background:#1a1714;color:#fff;border:none;padding:9px 16px;border-radius:8px;font-size:13px;font-weight:500;cursor:pointer")}
          >
            Retry
          </button>
        </div>
      ) : null}

      {!loading && !loadError && tab === "orders" ? (
        <div style={s("display:flex;flex-direction:column;gap:12px")}>
          {orders.length === 0 ? (
            <div style={s("color:#8a8275;font-size:13.5px")}>No orders yet.</div>
          ) : (
            orders.map((o) => (
              <div key={o.id} style={s(`${CARD_STYLE};display:flex;justify-content:space-between;align-items:center`)}>
                <div>
                  <div style={s("font:500 13.5px 'Geist Mono',monospace")}>#{o.orderNumber}</div>
                  <div style={s("font-size:12.5px;color:#8a8275;margin-top:3px")}>
                    {o.itemCount} items · {new Date(o.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                  </div>
                </div>
                <div style={s("text-align:right")}>
                  <div style={s("font:500 14px 'Geist Mono',monospace")}>{money(o.total)}</div>
                  <div style={s("font-size:12px;color:#8a8275;margin-top:3px")}>{o.status}</div>
                </div>
              </div>
            ))
          )}
        </div>
      ) : null}

      {!loading && !loadError && tab === "addresses" ? (
        <div style={s("display:flex;flex-direction:column;gap:16px")}>
          {addresses.map((a) => (
            <div key={a.id} style={s(`${CARD_STYLE};display:flex;justify-content:space-between;align-items:flex-start`)}>
              <div style={s("font-size:13.5px;color:#5f5a52;line-height:1.6")}>
                {a.label ? <div style={s("font-weight:600;color:#1a1714")}>{a.label}</div> : null}
                <div>{a.addressLine1}{a.addressLine2 ? `, ${a.addressLine2}` : ""}</div>
                <div>{a.city}, {a.region} {a.postalCode}</div>
                <div>{a.country}</div>
                {a.isDefault ? <div style={s("color:#c2410c;font-size:12px;margin-top:4px")}>Default</div> : null}
              </div>
              <div style={s("display:flex;flex-direction:column;gap:8px;align-items:flex-end")}>
                {!a.isDefault ? (
                  <span onClick={() => makeDefault(a.id)} style={s("font-size:12px;color:#c2410c;cursor:pointer")}>
                    Make default
                  </span>
                ) : null}
                <span onClick={() => removeAddress(a.id)} style={s("font-size:12px;color:#9a948a;cursor:pointer")}>
                  Remove
                </span>
              </div>
            </div>
          ))}

          <div style={s(CARD_STYLE)}>
            <div style={s("font-size:14px;font-weight:600;margin-bottom:14px")}>Add a new address</div>
            <div style={s("display:flex;flex-direction:column;gap:10px")}>
              <input placeholder="Label (Home, Work…)" value={newAddress.label} onChange={(e) => setNewAddress((f) => ({ ...f, label: e.target.value }))} style={s(FIELD_STYLE)} />
              <input placeholder="Address line 1" value={newAddress.addressLine1} onChange={(e) => setNewAddress((f) => ({ ...f, addressLine1: e.target.value }))} style={s(FIELD_STYLE)} />
              <input placeholder="Address line 2 (optional)" value={newAddress.addressLine2} onChange={(e) => setNewAddress((f) => ({ ...f, addressLine2: e.target.value }))} style={s(FIELD_STYLE)} />
              <div className="gb-row-2" style={s("display:grid;gap:10px")}>
                <input placeholder="City" value={newAddress.city} onChange={(e) => setNewAddress((f) => ({ ...f, city: e.target.value }))} style={s(FIELD_STYLE)} />
                <input placeholder="State / region" value={newAddress.region} onChange={(e) => setNewAddress((f) => ({ ...f, region: e.target.value }))} style={s(FIELD_STYLE)} />
              </div>
              <div className="gb-row-2" style={s("display:grid;gap:10px")}>
                <input placeholder="Postal code" value={newAddress.postalCode} onChange={(e) => setNewAddress((f) => ({ ...f, postalCode: e.target.value }))} style={s(FIELD_STYLE)} />
                <input placeholder="Country" value={newAddress.country} onChange={(e) => setNewAddress((f) => ({ ...f, country: e.target.value }))} style={s(FIELD_STYLE)} />
              </div>
              <label style={s("display:flex;align-items:center;gap:8px;font-size:12.5px;color:#5f5a52")}>
                <input type="checkbox" checked={newAddress.isDefault} onChange={(e) => setNewAddress((f) => ({ ...f, isDefault: e.target.checked }))} />
                Set as default
              </label>
              <Hv
                as="button"
                onClick={saveAddress}
                css="background:#c2410c;color:#fff;border:none;padding:11px;border-radius:9px;font-size:13.5px;font-weight:500;cursor:pointer;transition:background .25s"
                hover="background:#9a330a"
              >
                {addingAddress ? "Saving…" : "Save address"}
              </Hv>
            </div>
          </div>
        </div>
      ) : null}

      {!loading && !loadError && tab === "wishlist" ? (
        <div className="gb-cols-4" style={s("display:grid;gap:18px")}>
          {wishlist.length === 0 ? (
            <div style={s("color:#8a8275;font-size:13.5px;grid-column:1/-1")}>No saved items yet.</div>
          ) : (
            wishlist.map((w) =>
              w.product ? (
                <div key={w.productId} style={s("display:flex;flex-direction:column;gap:8px")}>
                  <div
                    onClick={() => router.push(`/product/${w.productId}`)}
                    style={s(
                      "position:relative;aspect-ratio:4/5;background:#f1ece2;border-radius:12px;overflow:hidden;cursor:pointer",
                    )}
                  >
                    <Image
                      src={img(w.product.imgId, 400)}
                      alt={w.product.name}
                      fill
                      sizes="(max-width: 620px) 50vw, 25vw"
                      style={s("object-fit:cover")}
                    />
                  </div>
                  <div style={s("display:flex;justify-content:space-between;font-size:13px")}>
                    <span>{w.product.name}</span>
                    <span style={s("font:500 12.5px 'Geist Mono',monospace")}>${w.product.price}</span>
                  </div>
                  <span onClick={() => removeWishlistItem(w.productId)} style={s("font-size:12px;color:#9a948a;cursor:pointer")}>
                    Remove
                  </span>
                </div>
              ) : null,
            )
          )}
        </div>
      ) : null}
    </main>
  );
}
