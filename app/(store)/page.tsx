"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { img } from "@/lib/catalog";
import { useStore } from "@/lib/store";
import { s } from "@/lib/style";
import { Hv } from "@/components/Hover";
import { ProductCard } from "@/components/ProductCard";

const TILE_DEFS: [string, string][] = [
  ["T-Shirts", "1521572163474-6864f9cf17ab"],
  ["Knitwear", "1556905055-8f358a7a47b2"],
  ["Denim", "1576995853123-5a10305d93c0"],
  ["Outerwear", "1591047139829-d91aecb6caea"],
  ["Sweats", "1620799140188-3b2a02fd9a77"],
  ["Shirts", "1596755094514-f87e34085b2c"],
];

export default function HomePage() {
  const router = useRouter();
  const { catalog, catalogError, catalogLoading, reloadCatalog } = useStore();
  const catCount = (c: string) => catalog.filter((p) => p.cat === c).length;

  let newArrivals = catalog.filter((p) => p.tags.includes("New")).slice(0, 8);
  if (newArrivals.length < 8) newArrivals = catalog.slice(0, 8);

  return (
    <main style={s("flex:1")}>
      {/* hero */}
      <section
        className="gb-split-104"
        style={s("max-width:1280px;margin:0 auto;display:grid;gap:48px;align-items:center;padding:72px 28px 60px")}
      >
        <div style={s("display:flex;flex-direction:column;gap:26px;animation:gbFade .8s both")}>
          <span style={s("font:500 12px 'Geist Mono',monospace;letter-spacing:.18em;color:#c2410c")}>
            AUTUMN 2026 · NEW IN
          </span>
          <h1 style={s("font-size:clamp(34px,8vw,60px);line-height:1.0;letter-spacing:-.035em;font-weight:600;margin:0")}>
            Considered essentials, made to last.
          </h1>
          <p style={s("font-size:17.5px;line-height:1.6;color:#5f5a52;margin:0;max-width:440px")}>
            Durable, unfussy clothing in honest materials — designed, cut, and finished in small batches at our studio in
            Pittsburgh.
          </p>
          <div style={s("display:flex;gap:14px;flex-wrap:wrap")}>
            <Hv
              as="button"
              onClick={() => router.push("/shop")}
              css="background:#c2410c;color:#fff;border:none;padding:16px 28px;border-radius:10px;font-size:15px;font-weight:500;cursor:pointer;transition:transform .25s,background .25s"
              hover="transform:translateY(-2px);background:#9a330a"
            >
              Shop the collection
            </Hv>
            <Hv
              as="button"
              onClick={() => router.push("/about")}
              css="background:transparent;color:#1a1714;border-width:1px;border-style:solid;border-color:#d6cfc2;padding:16px 28px;border-radius:10px;font-size:15px;font-weight:500;cursor:pointer;transition:border-color .25s,transform .25s"
              hover="border-color:#1a1714;transform:translateY(-2px)"
            >
              Our story
            </Hv>
          </div>
          <div style={s("display:flex;gap:30px;padding-top:10px;border-top:1px solid #e7e0d3;margin-top:6px")}>
            <div>
              <div style={s("font:500 22px 'Geist Mono',monospace")}>150+</div>
              <div style={s("font-size:12.5px;color:#8a8275;margin-top:2px")}>Styles in stock</div>
            </div>
            <div>
              <div style={s("font:500 22px 'Geist Mono',monospace")}>4.8★</div>
              <div style={s("font-size:12.5px;color:#8a8275;margin-top:2px")}>Avg. rating</div>
            </div>
            <div>
              <div style={s("font:500 22px 'Geist Mono',monospace")}>30-day</div>
              <div style={s("font-size:12.5px;color:#8a8275;margin-top:2px")}>Easy returns</div>
            </div>
          </div>
        </div>
        <div style={s("position:relative;animation:gbScale 1s both")}>
          <div
            style={s(
              "position:relative;aspect-ratio:4/5;border-radius:20px;overflow:hidden;background:#eceae4;box-shadow:0 40px 80px -50px rgba(40,30,20,.6)",
            )}
          >
            <Image
              src={img("1503341504253-dff4815485f1", 900)}
              alt="Graybridge collection"
              fill
              sizes="(max-width: 760px) 100vw, 480px"
              priority
              style={s("object-fit:cover")}
            />
          </div>
          <div
            style={s(
              "position:absolute;bottom:24px;left:-22px;background:#fff;border-radius:14px;padding:14px 18px;box-shadow:0 20px 44px -20px rgba(40,30,20,.5);display:flex;flex-direction:column;gap:3px;animation:gbFloat 7s ease-in-out infinite",
            )}
          >
            <span style={s("font:500 10.5px 'Geist Mono',monospace;color:#9a948a;letter-spacing:.05em")}>FEATURED</span>
            <span style={s("font-size:14px;font-weight:500")}>The Everyday Edit</span>
            <span style={s("font:500 13px 'Geist Mono',monospace;color:#c2410c")}>From $38</span>
          </div>
        </div>
      </section>

      {/* category tiles */}
      <section style={s("max-width:1280px;margin:0 auto;padding:8px 28px 20px")}>
        <div className="gb-cols-3" style={s("display:grid;gap:16px")}>
          {TILE_DEFS.map((t, i) => (
            <div
              key={t[0]}
              onClick={() => router.push("/shop?cat=" + encodeURIComponent(t[0]))}
              style={s(
                `position:relative;aspect-ratio:3/2;border-radius:16px;overflow:hidden;background:#eceae4;cursor:pointer;animation:gbFade .6s both;animation-delay:${(i * 0.06).toFixed(2)}s`,
              )}
            >
              <Hv
                as="img"
                css="width:100%;height:100%;object-fit:cover;transition:transform .7s cubic-bezier(.2,.7,.2,1)"
                hover="transform:scale(1.06)"
                src={img(t[1], 600)}
                alt={t[0]}
              />
              <div style={s("position:absolute;inset:0;background:linear-gradient(transparent 45%,rgba(20,15,10,.5))")} />
              <div
                style={s(
                  "position:absolute;left:18px;right:18px;bottom:16px;display:flex;align-items:center;gap:8px;flex-wrap:wrap",
                )}
              >
                <span style={s("color:#fff;font-size:17px;font-weight:600;letter-spacing:-.01em")}>{t[0]}</span>
                <span style={s("font:400 11px 'Geist Mono',monospace;color:rgba(255,255,255,.8)")}>
                  {catCount(t[0])} styles
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* new this week */}
      <section style={s("max-width:1280px;margin:0 auto;padding:54px 28px 30px")}>
        <div style={s("display:flex;justify-content:space-between;align-items:flex-end;margin-bottom:28px")}>
          <div>
            <span style={s("font:500 12px 'Geist Mono',monospace;letter-spacing:.16em;color:#c2410c")}>JUST LANDED</span>
            <h2 style={s("font-size:30px;font-weight:600;letter-spacing:-.02em;margin:8px 0 0")}>New this week</h2>
          </div>
          <span
            onClick={() => router.push("/shop?cat=All&tag=New")}
            style={s(
              "font:500 13px 'Geist Mono',monospace;color:#1a1714;cursor:pointer;border-bottom:1px solid #c2410c;padding-bottom:2px",
            )}
          >
            View all →
          </span>
        </div>
        {catalogError && !catalogLoading ? (
          <div
            style={s(
              "display:flex;align-items:center;justify-content:space-between;gap:14px;background:#f7e6e1;border:1px solid #e6c3b8;border-radius:12px;padding:14px 18px;color:#8a3a25;font-size:13.5px",
            )}
          >
            <span>Couldn&apos;t load products. Check your connection and try again.</span>
            <button
              onClick={reloadCatalog}
              style={s("background:#1a1714;color:#fff;border:none;padding:8px 16px;border-radius:8px;font-size:13px;font-weight:500;cursor:pointer;white-space:nowrap")}
            >
              Retry
            </button>
          </div>
        ) : (
          <div className="gb-cols-4" style={s("display:grid;gap:22px")}>
            {newArrivals.map((p, i) => (
              <ProductCard key={p.id} p={p} i={i} showAdd showBadge showCat />
            ))}
          </div>
        )}
      </section>

      {/* standard banner */}
      <section style={s("max-width:1280px;margin:40px auto 0;padding:0 28px")}>
        <div className="gb-split-11" style={s("background:#1a1714;border-radius:24px;overflow:hidden;display:grid")}>
          <div style={s("padding:56px 56px;display:flex;flex-direction:column;gap:20px;justify-content:center")}>
            <span style={s("font:500 12px 'Geist Mono',monospace;letter-spacing:.16em;color:#e08a5b")}>
              THE GRAYBRIDGE STANDARD
            </span>
            <h2 style={s("font-size:clamp(26px,7vw,36px);line-height:1.08;letter-spacing:-.025em;font-weight:600;margin:0;color:#fff")}>
              Fewer, better things — built to be worn for years.
            </h2>
            <p style={s("font-size:16px;line-height:1.6;color:#b3aca0;margin:0;max-width:430px")}>
              Organic and recycled fibers, reinforced seams, and honest pricing. No seasonal churn, no throwaway fashion.
            </p>
            <div style={s("display:flex;gap:12px;margin-top:6px")}>
              <Hv
                as="button"
                onClick={() => router.push("/shop")}
                css="background:#c2410c;color:#fff;border:none;padding:14px 24px;border-radius:9px;font-size:14.5px;font-weight:500;cursor:pointer;transition:background .25s"
                hover="background:#e0561d"
              >
                Browse everything
              </Hv>
              <Hv
                as="button"
                onClick={() => router.push("/about")}
                css="background:transparent;color:#fff;border-width:1px;border-style:solid;border-color:#44403a;padding:14px 24px;border-radius:9px;font-size:14.5px;font-weight:500;cursor:pointer;transition:border-color .25s"
                hover="border-color:#fff"
              >
                How we make it
              </Hv>
            </div>
          </div>
          <div style={s("position:relative;min-height:340px;background:#26211c")}>
            <Image
              src="https://images.unsplash.com/photo-1445205170230-053b83016050?fm=jpg&q=70&w=900&auto=format&fit=crop"
              alt="Studio"
              fill
              sizes="(max-width: 760px) 100vw, 50vw"
              style={s("object-fit:cover;opacity:.92")}
            />
          </div>
        </div>
      </section>
    </main>
  );
}
