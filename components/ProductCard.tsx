"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { badgeOf, img, type Product } from "@/lib/catalog";
import { useStore } from "@/lib/store";
import { s } from "@/lib/style";
import { Hv } from "./Hover";

interface Props {
  p: Product;
  i?: number;
  showAdd?: boolean;
  showBadge?: boolean;
  showCat?: boolean;
  showWas?: boolean;
}

export function ProductCard({ p, i = 0, showAdd, showBadge, showCat, showWas }: Props) {
  const router = useRouter();
  const { addToCart, wishlist, toggleWishlist } = useStore();
  const delay = ((i % 12) * 0.05).toFixed(2) + "s";
  const badge = badgeOf(p);
  const open = () => router.push("/product/" + p.id);
  const saved = wishlist.includes(p.id);
  const firstInStock = p.variants.find((v) => v.stock > 0);

  return (
    <div style={s(`display:flex;flex-direction:column;gap:12px;animation:gbFade .5s both;animation-delay:${delay}`)}>
      <div
        onClick={open}
        style={s(
          "position:relative;aspect-ratio:4/5;background:#f1ece2;border-radius:14px;overflow:hidden;cursor:pointer;border:1px solid #ece7df",
        )}
      >
        <Hv
          as={Image}
          fill
          sizes="(max-width: 620px) 50vw, (max-width: 1024px) 33vw, 25vw"
          priority={i < 4}
          css="object-fit:cover;transition:transform .65s cubic-bezier(.2,.7,.2,1)"
          hover="transform:scale(1.06)"
          src={img(p.imgId, 500)}
          alt={p.name}
        />
        <Hv
          as="span"
          onClick={(e: React.MouseEvent) => {
            e.stopPropagation();
            toggleWishlist(p.id);
          }}
          css="position:absolute;top:10px;right:10px;width:30px;height:30px;border-radius:999px;background:rgba(255,255,255,.9);display:flex;align-items:center;justify-content:center;cursor:pointer;transition:transform .2s"
          hover="transform:scale(1.1)"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill={saved ? "#c2410c" : "none"} stroke={saved ? "#c2410c" : "#1a1714"} strokeWidth="1.8">
            <path d="M12 21s-7.5-4.7-10-9.1C.5 8.4 2.3 5 5.7 5c2 0 3.4 1 5 3 1.6-2 3-3 5-3 3.4 0 5.2 3.4 3.7 6.9C19.5 16.3 12 21 12 21z" />
          </svg>
        </Hv>
        {showBadge && badge ? (
          <span
            style={s(
              "position:absolute;top:12px;left:12px;background:#fff;color:#1a1714;font:500 10.5px 'Geist Mono',monospace;letter-spacing:.04em;padding:5px 9px;border-radius:6px;text-transform:uppercase",
            )}
          >
            {badge}
          </span>
        ) : null}
        {showAdd && firstInStock ? (
          <Hv
            as="button"
            onClick={(e: React.MouseEvent) => {
              e.stopPropagation();
              addToCart(p.id, firstInStock.size, firstInStock.color);
            }}
            css="position:absolute;bottom:12px;right:12px;width:38px;height:38px;border-radius:999px;border:none;background:#1a1714;color:#fff;font-size:21px;line-height:1;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:transform .25s,background .25s"
            hover="transform:scale(1.12);background:#c2410c"
          >
            +
          </Hv>
        ) : null}
      </div>
      <div
        onClick={open}
        style={s("display:flex;justify-content:space-between;align-items:baseline;gap:10px;cursor:pointer")}
      >
        {showCat ? (
          <div>
            <div style={s("font-size:14.5px;font-weight:500")}>{p.name}</div>
            <div
              style={s(
                "font:400 11.5px 'Geist Mono',monospace;color:#9a948a;margin-top:3px;text-transform:uppercase;letter-spacing:.04em",
              )}
            >
              {p.cat}
            </div>
          </div>
        ) : (
          <div style={s("font-size:14px;font-weight:500")}>{p.name}</div>
        )}
        {showWas ? (
          <div style={s("display:flex;flex-direction:column;align-items:flex-end")}>
            <span style={s("font:500 14px 'Geist Mono',monospace")}>${p.price}</span>
            {p.wasPrice ? (
              <span style={s("font:400 11.5px 'Geist Mono',monospace;color:#b3ada3;text-decoration:line-through")}>
                ${p.wasPrice}
              </span>
            ) : null}
          </div>
        ) : (
          <div style={s(showCat ? "font:500 14px 'Geist Mono',monospace" : "font:500 13.5px 'Geist Mono',monospace")}>
            ${p.price}
          </div>
        )}
      </div>
    </div>
  );
}
