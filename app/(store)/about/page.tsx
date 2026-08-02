"use client";

import { useRouter } from "next/navigation";
import { s } from "@/lib/style";
import { Hv } from "@/components/Hover";

export default function AboutPage() {
  const router = useRouter();

  return (
    <main style={s("flex:1")}>
      <section
        style={s(
          "max-width:900px;margin:0 auto;padding:80px 28px 50px;text-align:center;display:flex;flex-direction:column;align-items:center;gap:22px;animation:gbFade .6s both",
        )}
      >
        <span style={s("font:500 12px 'Geist Mono',monospace;letter-spacing:.18em;color:#c2410c")}>
          EST. 2018 · PITTSBURGH, PA
        </span>
        <h1 style={s("font-size:50px;line-height:1.05;letter-spacing:-.03em;font-weight:600;margin:0")}>
          A small shop with a long view.
        </h1>
        <p style={s("font-size:18px;line-height:1.6;color:#5f5a52;margin:0;max-width:600px")}>
          Graybridge began in a Lawrenceville garage with one heavyweight tee and a stubborn belief that everyday clothes
          should outlast the season they&apos;re bought in.
        </p>
      </section>

      <section style={s("max-width:1280px;margin:0 auto;padding:10px 28px 30px")}>
        <div style={s("aspect-ratio:21/9;border-radius:22px;overflow:hidden;background:#eceae4;animation:gbScale .7s both")}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?fm=jpg&q=70&w=1600&auto=format&fit=crop"
            alt="The Graybridge workshop"
            style={s("width:100%;height:100%;object-fit:cover")}
          />
        </div>
      </section>

      <section style={s("max-width:1000px;margin:0 auto;padding:50px 28px;display:grid;grid-template-columns:repeat(3,1fr);gap:30px")}>
        <div style={s("animation:gbFade .5s both")}>
          <div style={s("font:500 30px 'Geist Mono',monospace;color:#c2410c")}>2018</div>
          <div style={s("font-size:14px;color:#5f5a52;margin-top:6px;line-height:1.5")}>
            Founded on Butler Street with a single style and a borrowed sewing machine.
          </div>
        </div>
        <div style={s("animation:gbFade .5s both;animation-delay:.08s")}>
          <div style={s("font:500 30px 'Geist Mono',monospace;color:#c2410c")}>100%</div>
          <div style={s("font-size:14px;color:#5f5a52;margin-top:6px;line-height:1.5")}>
            Organic or recycled fibers across the core range, audited every season.
          </div>
        </div>
        <div style={s("animation:gbFade .5s both;animation-delay:.16s")}>
          <div style={s("font:500 30px 'Geist Mono',monospace;color:#c2410c")}>38k</div>
          <div style={s("font-size:14px;color:#5f5a52;margin-top:6px;line-height:1.5")}>
            Garments sold to people who, mostly, keep coming back.
          </div>
        </div>
      </section>

      <section
        style={s(
          "max-width:980px;margin:0 auto;padding:20px 28px 30px;display:grid;grid-template-columns:1fr 1fr;gap:48px;align-items:center",
        )}
      >
        <div style={s("aspect-ratio:4/5;border-radius:18px;overflow:hidden;background:#eceae4;animation:gbScale .6s both")}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="https://images.unsplash.com/photo-1490481651871-ab68de25d43d?fm=jpg&q=70&w=900&auto=format&fit=crop"
            alt="On the floor"
            style={s("width:100%;height:100%;object-fit:cover")}
          />
        </div>
        <div style={s("display:flex;flex-direction:column;gap:18px;animation:gbFade .6s both")}>
          <h2 style={s("font-size:30px;font-weight:600;letter-spacing:-.02em;margin:0")}>
            Made down the street, not across the world.
          </h2>
          <p style={s("font-size:15.5px;line-height:1.65;color:#5f5a52;margin:0")}>
            We cut and sew with a family-run shop in the Strip District, pay fairly, and price honestly. No middlemen, no
            markdown games — just clothes we&apos;d wear ourselves, and a team of eleven who stand behind every stitch.
          </p>
          <p style={s("font-size:15.5px;line-height:1.65;color:#5f5a52;margin:0")}>
            Visit us at <strong style={s("color:#1a1714")}>2231 Penn Avenue</strong>, open Thursday through Sunday.
            Coffee&apos;s usually on.
          </p>
          <Hv
            as="button"
            onClick={() => router.push("/shop")}
            css="align-self:flex-start;background:#1a1714;color:#fff;border:none;padding:14px 26px;border-radius:10px;font-size:14.5px;font-weight:500;cursor:pointer;transition:background .25s"
            hover="background:#000"
          >
            Shop the collection
          </Hv>
        </div>
      </section>
    </main>
  );
}
