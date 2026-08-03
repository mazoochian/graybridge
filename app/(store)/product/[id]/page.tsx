"use client";

import { useState } from "react";
import { notFound, useParams, useRouter } from "next/navigation";
import { badgeOf, cats, desc, img, SIZES, swatchHex } from "@/lib/catalog";
import { useStore } from "@/lib/store";
import { s } from "@/lib/style";
import { Hv } from "@/components/Hover";
import { ProductCard } from "@/components/ProductCard";

export default function ProductPage() {
  const router = useRouter();
  const routeParams = useParams();
  const { catalog, catalogLoading, catalogError, reloadCatalog, addToCart, wishlist, toggleWishlist } = useStore();

  const rawId = Array.isArray(routeParams.id) ? routeParams.id[0] : routeParams.id;
  const id = Number(rawId);
  const p = catalog.find((x) => x.id === id);

  const [size, setSize] = useState("M");
  const [qty, setQty] = useState(1);
  const [imgIdx, setImgIdx] = useState(0);
  const [colorIdx, setColorIdx] = useState(0);

  if (!p) {
    // Not a numeric id at all — never going to resolve, no point waiting.
    if (!Number.isInteger(id)) notFound();

    if (catalogLoading) {
      return <main style={s("flex:1;max-width:1280px;margin:0 auto;width:100%;padding:60px 28px;color:#8a8275")}>Loading…</main>;
    }
    if (catalogError) {
      return (
        <main style={s("flex:1;max-width:1280px;margin:0 auto;width:100%;padding:60px 28px;display:flex;flex-direction:column;gap:14px;align-items:flex-start")}>
          <p style={s("color:#5f5a52;font-size:15px")}>Couldn't load this product. Check your connection and try again.</p>
          <Hv
            as="button"
            onClick={reloadCatalog}
            css="background:#1a1714;color:#fff;border:none;padding:11px 20px;border-radius:9px;font-size:14px;font-weight:500;cursor:pointer"
            hover="background:#332e28"
          >
            Retry
          </Hv>
        </main>
      );
    }
    // Catalog loaded successfully and this id genuinely isn't in it.
    notFound();
  }

  const pool = (cats[p.cat] || cats["T-Shirts"]).ids;
  const gallery = [p.imgId].concat(pool.filter((x) => x !== p.imgId)).slice(0, 3);
  while (gallery.length < 3) gallery.push(p.imgId);

  const badge = badgeOf(p);
  const selectedColor = p.colors[colorIdx] || p.colors[0];
  const stockFor = (color: string, sz: string) => p.variants.find((v) => v.color === color && v.size === sz)?.stock ?? 0;
  const variantStock = stockFor(selectedColor, size);
  const stockLabel = variantStock === 0 ? "Out of stock" : variantStock < 5 ? "Only " + variantStock + " left" : "In stock";
  const related = catalog.filter((x) => x.cat === p.cat && x.id !== p.id).slice(0, 4);

  return (
    <main style={s("flex:1;max-width:1280px;margin:0 auto;width:100%;padding:30px 28px 64px")}>
      <div style={s("font:400 12px 'Geist Mono',monospace;color:#9a948a;margin-bottom:22px;animation:gbFade .4s both")}>
        <span onClick={() => router.push("/")} style={s("cursor:pointer")}>
          Home
        </span>{" "}
        /{" "}
        <span onClick={() => router.push("/shop?cat=" + encodeURIComponent(p.cat))} style={s("cursor:pointer")}>
          {p.cat}
        </span>{" "}
        / <span style={s("color:#1a1714")}>{p.name}</span>
      </div>

      <div style={s("display:grid;grid-template-columns:1.1fr .9fr;gap:48px;align-items:start")}>
        <div style={s("display:flex;gap:14px;animation:gbScale .6s both")}>
          <div style={s("display:flex;flex-direction:column;gap:10px;width:78px;flex-shrink:0")}>
            {gallery.map((g, i) => (
              <div
                key={i}
                onClick={() => setImgIdx(i)}
                style={s(
                  `aspect-ratio:4/5;border-radius:10px;overflow:hidden;cursor:pointer;border:2px solid ${
                    imgIdx === i ? "#1a1714" : "transparent"
                  }`,
                )}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={img(g, 200)} alt="" style={s("width:100%;height:100%;object-fit:cover")} />
              </div>
            ))}
          </div>
          <div style={s("flex:1;aspect-ratio:4/5;border-radius:18px;overflow:hidden;background:#f1ece2;border:1px solid #ece7df")}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={img(gallery[imgIdx] || gallery[0], 900)} alt={p.name} style={s("width:100%;height:100%;object-fit:cover")} />
          </div>
        </div>

        <div style={s("display:flex;flex-direction:column;gap:20px;animation:gbFade .6s both;position:sticky;top:90px")}>
          <div style={s("display:flex;align-items:center;gap:10px")}>
            <span style={s("font:400 12px 'Geist Mono',monospace;color:#c2410c;text-transform:uppercase;letter-spacing:.06em")}>
              {p.cat}
            </span>
            {badge ? (
              <span
                style={s(
                  "background:#f1ece2;color:#1a1714;font:500 10.5px 'Geist Mono',monospace;padding:4px 9px;border-radius:6px;text-transform:uppercase",
                )}
              >
                {badge}
              </span>
            ) : null}
          </div>
          <h1 style={s("font-size:36px;font-weight:600;letter-spacing:-.025em;margin:0;line-height:1.08")}>{p.name}</h1>
          <div style={s("display:flex;align-items:center;gap:14px")}>
            <div style={s("display:flex;align-items:baseline;gap:10px")}>
              <span style={s("font:500 24px 'Geist Mono',monospace")}>${p.price}</span>
              {p.wasPrice ? (
                <span style={s("font:400 16px 'Geist Mono',monospace;color:#b3ada3;text-decoration:line-through")}>
                  ${p.wasPrice}
                </span>
              ) : null}
            </div>
            <span style={s("color:#d6cfc2")}>|</span>
            <span style={s("font-size:13.5px;color:#6b6459")}>
              ★ {p.rating} <span style={s("color:#9a948a")}>({p.reviews})</span>
            </span>
          </div>
          <p style={s("font-size:15.5px;line-height:1.65;color:#5f5a52;margin:0;max-width:460px")}>{desc(p)}</p>

          <div style={s("display:flex;flex-direction:column;gap:11px")}>
            <span style={s("font-size:13px;font-weight:500")}>
              Color · <span style={s("color:#8a8275;font-weight:400")}>{p.colors[colorIdx] || p.colors[0]}</span>
            </span>
            <div style={s("display:flex;gap:10px")}>
              {p.colors.map((cn, i) => (
                <div
                  key={cn}
                  onClick={() => setColorIdx(i)}
                  title={cn}
                  style={s(
                    `width:30px;height:30px;border-radius:999px;cursor:pointer;background:${swatchHex(
                      cn,
                    )};box-shadow:0 0 0 2px #fff,0 0 0 ${colorIdx === i ? "2px" : "0px"} #1a1714;border:1px solid rgba(0,0,0,.12)`,
                  )}
                />
              ))}
            </div>
          </div>

          <div style={s("display:flex;flex-direction:column;gap:11px")}>
            <div style={s("display:flex;justify-content:space-between")}>
              <span style={s("font-size:13px;font-weight:500")}>Size</span>
              <span style={s("font-size:12.5px;color:#c2410c;cursor:pointer")}>Size guide</span>
            </div>
            <div style={s("display:flex;gap:9px")}>
              {SIZES.map((sz) => {
                const active = size === sz;
                const available = stockFor(selectedColor, sz) > 0;
                return (
                  <div
                    key={sz}
                    onClick={() => available && setSize(sz)}
                    style={s(
                      `min-width:48px;text-align:center;padding:11px 0;border-radius:9px;font-size:13.5px;font-weight:500;border:1px solid ${
                        active ? "#1a1714" : "#e0d9cc"
                      };background:${active ? "#1a1714" : "#fff"};color:${
                        available ? (active ? "#fff" : "#1a1714") : "#c7c0b3"
                      };transition:all .18s;${available ? "cursor:pointer" : "cursor:not-allowed;text-decoration:line-through"}`,
                    )}
                  >
                    {sz}
                  </div>
                );
              })}
            </div>
          </div>

          <div style={s("display:flex;gap:12px;margin-top:6px")}>
            <div style={s("display:flex;align-items:center;border:1px solid #e0d9cc;border-radius:10px;background:#fff")}>
              <span
                onClick={() => setQty((q) => Math.max(1, q - 1))}
                style={s("padding:0 15px;font-size:19px;cursor:pointer;color:#6b6459;user-select:none")}
              >
                −
              </span>
              <span style={s("min-width:30px;text-align:center;font:500 15px 'Geist Mono',monospace")}>{qty}</span>
              <span
                onClick={() => setQty((q) => q + 1)}
                style={s("padding:0 15px;font-size:19px;cursor:pointer;color:#6b6459;user-select:none")}
              >
                +
              </span>
            </div>
            <Hv
              as="button"
              onClick={() => {
                if (variantStock === 0) return;
                for (let n = 0; n < qty; n++) addToCart(p.id, size, selectedColor);
              }}
              css={`flex:1;color:#fff;border:none;padding:15px;border-radius:10px;font-size:15px;font-weight:500;transition:background .25s,transform .2s;${
                variantStock === 0 ? "background:#c7c0b3;cursor:not-allowed" : "background:#c2410c;cursor:pointer"
              }`}
              hover={variantStock === 0 ? "" : "background:#9a330a;transform:translateY(-1px)"}
            >
              {variantStock === 0 ? "Out of stock" : `Add to bag · $${p.price}`}
            </Hv>
            <Hv
              as="button"
              onClick={() => toggleWishlist(p.id)}
              title={wishlist.includes(p.id) ? "Remove from wishlist" : "Add to wishlist"}
              css="width:52px;height:52px;flex-shrink:0;border-radius:10px;border:1px solid #e0d9cc;background:#fff;display:flex;align-items:center;justify-content:center;cursor:pointer;transition:transform .2s"
              hover="transform:scale(1.06)"
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill={wishlist.includes(p.id) ? "#c2410c" : "none"}
                stroke={wishlist.includes(p.id) ? "#c2410c" : "#1a1714"}
                strokeWidth="1.8"
              >
                <path d="M12 21s-7.5-4.7-10-9.1C.5 8.4 2.3 5 5.7 5c2 0 3.4 1 5 3 1.6-2 3-3 5-3 3.4 0 5.2 3.4 3.7 6.9C19.5 16.3 12 21 12 21z" />
              </svg>
            </Hv>
          </div>

          <div
            style={s(
              "display:flex;flex-direction:column;gap:9px;border-top:1px solid #e7e0d3;padding-top:18px;margin-top:4px;font-size:13.5px;color:#5f5a52",
            )}
          >
            <div style={s("display:flex;gap:10px;align-items:center")}>
              <span style={s("color:#c2410c")}>✓</span> Free carbon-neutral shipping over $75
            </div>
            <div style={s("display:flex;gap:10px;align-items:center")}>
              <span style={s("color:#c2410c")}>✓</span> 30-day returns, no questions asked
            </div>
            <div style={s("display:flex;gap:10px;align-items:center")}>
              <span style={s("color:#c2410c")}>✓</span> SKU {p.sku} · {stockLabel}
            </div>
          </div>
        </div>
      </div>

      <section style={s("margin-top:64px")}>
        <h2 style={s("font-size:24px;font-weight:600;letter-spacing:-.02em;margin:0 0 24px")}>You might also like</h2>
        <div style={s("display:grid;grid-template-columns:repeat(4,1fr);gap:22px")}>
          {related.map((r, i) => (
            <ProductCard key={r.id} p={r} i={i} />
          ))}
        </div>
      </section>
    </main>
  );
}
