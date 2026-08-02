"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useStore } from "@/lib/store";
import { s } from "@/lib/style";
import { ProductCard } from "@/components/ProductCard";

const CAT_NAMES = ["All", "T-Shirts", "Knitwear", "Outerwear", "Denim", "Sweats", "Shirts"];
const TAG_NAMES = ["New", "Bestseller", "Limited", "Sale", "Organic Cotton", "Heavyweight", "Relaxed Fit", "Unisex"];

function ShopInner() {
  const router = useRouter();
  const params = useSearchParams();
  const { catalog } = useStore();

  const [filterCat, setFilterCat] = useState(params.get("cat") || "All");
  const [filterTags, setFilterTags] = useState<string[]>(params.get("tag") ? [params.get("tag") as string] : []);
  const [sort, setSort] = useState("featured");
  const [search, setSearch] = useState(params.get("q") || "");

  const catCount = (c: string) => catalog.filter((p) => p.cat === c).length;

  let list = catalog.slice();
  if (filterCat !== "All") list = list.filter((p) => p.cat === filterCat);
  if (search) {
    const q = search.toLowerCase();
    list = list.filter((p) => (p.name + " " + p.cat).toLowerCase().includes(q));
  }
  if (filterTags.length) list = list.filter((p) => filterTags.every((t) => p.tags.includes(t)));
  if (sort === "low") list.sort((a, b) => a.price - b.price);
  else if (sort === "high") list.sort((a, b) => b.price - a.price);
  else if (sort === "name") list.sort((a, b) => a.name.localeCompare(b.name));
  else if (sort === "new") list.sort((a, b) => (b.tags.includes("New") ? 1 : 0) - (a.tags.includes("New") ? 1 : 0));

  const catLabel = filterCat === "All" ? "All clothing" : filterCat;
  const toggleTag = (t: string) =>
    setFilterTags((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : prev.concat(t)));
  const clearFilters = () => {
    setFilterCat("All");
    setFilterTags([]);
    setSearch("");
    setSort("featured");
  };

  return (
    <main style={s("flex:1;max-width:1280px;margin:0 auto;width:100%;padding:36px 28px 60px")}>
      <div style={s("display:flex;flex-direction:column;gap:6px;margin-bottom:26px;animation:gbFade .5s both")}>
        <span style={s("font:400 12px 'Geist Mono',monospace;color:#9a948a")}>
          <span onClick={() => router.push("/")} style={s("cursor:pointer")}>
            Home
          </span>{" "}
          / {catLabel}
        </span>
        <div style={s("display:flex;justify-content:space-between;align-items:flex-end;flex-wrap:wrap;gap:14px")}>
          <h1 style={s("font-size:34px;font-weight:600;letter-spacing:-.025em;margin:0")}>{catLabel}</h1>
          <div style={s("display:flex;align-items:center;gap:14px")}>
            <span style={s("font:400 12.5px 'Geist Mono',monospace;color:#8a8275")}>{list.length} items</span>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              style={s(
                "border:1px solid #e0d9cc;background:#fff;border-radius:9px;padding:9px 12px;font-size:13.5px;color:#1a1714;cursor:pointer",
              )}
            >
              <option value="featured">Featured</option>
              <option value="new">Newest</option>
              <option value="low">Price: Low to High</option>
              <option value="high">Price: High to Low</option>
              <option value="name">Alphabetical</option>
            </select>
          </div>
        </div>
      </div>

      <div style={s("display:grid;grid-template-columns:218px 1fr;gap:34px;align-items:start")}>
        <aside style={s("position:sticky;top:90px;display:flex;flex-direction:column;gap:28px;animation:gbFade .5s both")}>
          <div>
            <div
              style={s(
                "font:500 11px 'Geist Mono',monospace;letter-spacing:.1em;color:#9a948a;text-transform:uppercase;margin-bottom:12px",
              )}
            >
              Category
            </div>
            <div style={s("display:flex;flex-direction:column;gap:2px")}>
              {CAT_NAMES.map((c) => {
                const active = filterCat === c;
                return (
                  <div
                    key={c}
                    onClick={() => setFilterCat(c)}
                    style={s(
                      `display:flex;justify-content:space-between;align-items:center;padding:8px 11px;border-radius:8px;cursor:pointer;font-size:14px;background:${
                        active ? "#1a1714" : "transparent"
                      };color:${active ? "#fff" : "#3b362f"};font-weight:${active ? "500" : "400"};transition:background .2s`,
                    )}
                  >
                    <span>{c}</span>
                    <span style={s("font:400 11px 'Geist Mono',monospace;opacity:.6")}>
                      {c === "All" ? catalog.length : catCount(c)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
          <div>
            <div
              style={s(
                "font:500 11px 'Geist Mono',monospace;letter-spacing:.1em;color:#9a948a;text-transform:uppercase;margin-bottom:12px",
              )}
            >
              Tags
            </div>
            <div style={s("display:flex;flex-wrap:wrap;gap:8px")}>
              {TAG_NAMES.map((t) => {
                const active = filterTags.includes(t);
                return (
                  <span
                    key={t}
                    onClick={() => toggleTag(t)}
                    style={s(
                      `font-size:12.5px;padding:6px 12px;border-radius:999px;cursor:pointer;border:1px solid ${
                        active ? "#c2410c" : "#e0d9cc"
                      };background:${active ? "#c2410c" : "#fff"};color:${active ? "#fff" : "#5f5a52"};transition:all .2s`,
                    )}
                  >
                    {t}
                  </span>
                );
              })}
            </div>
          </div>
          <button
            onClick={clearFilters}
            style={s(
              "align-self:flex-start;background:transparent;border:none;color:#c2410c;font-size:13px;font-weight:500;cursor:pointer;padding:0;border-bottom:1px solid #c2410c",
            )}
          >
            Clear all filters
          </button>
        </aside>

        <div>
          {list.length === 0 ? (
            <div style={s("padding:80px 0;text-align:center;color:#8a8275")}>
              <div style={s("font-size:18px;font-weight:500;color:#1a1714;margin-bottom:8px")}>No matches</div>
              <div style={s("font-size:14px")}>Try removing a filter or clearing your search.</div>
            </div>
          ) : (
            <div style={s("display:grid;grid-template-columns:repeat(3,1fr);gap:22px")}>
              {list.map((p, i) => (
                <ProductCard key={p.id} p={p} i={i} showAdd showBadge showCat showWas />
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

export default function ShopPage() {
  return (
    <Suspense fallback={<main style={s("flex:1")} />}>
      <ShopInner />
    </Suspense>
  );
}
