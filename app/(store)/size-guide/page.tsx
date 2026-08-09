import type { Metadata } from "next";
import { PolicyPage, PolicySection, P } from "@/components/PolicyPage";
import { s } from "@/lib/style";

export const metadata: Metadata = {
  title: "Size guide — Graybridge",
  description: "Measurements for the XS–XL range across the Graybridge collection.",
};

const ROWS = [
  { size: "XS", chest: "34–36", waist: "28–30", length: "26" },
  { size: "S", chest: "36–38", waist: "30–32", length: "27" },
  { size: "M", chest: "39–41", waist: "32–34", length: "28" },
  { size: "L", chest: "42–44", waist: "35–37", length: "29" },
  { size: "XL", chest: "45–48", waist: "38–41", length: "30" },
];

const TH = "text-align:left;font:500 12px 'Geist Mono',monospace;letter-spacing:.12em;color:#9a948a;padding:0 0 12px";
const TD = "font-size:15px;color:#5f5a52;padding:13px 0;border-top:1px solid #ece7dd";

export default function SizeGuidePage() {
  return (
    <PolicyPage
      eyebrow="HELP"
      title="Size guide"
      intro="One size range across the whole collection, so a medium tee and a medium knit fit the same way."
    >
      <PolicySection heading="Measurements">
        <P>All measurements are in inches and describe the body, not the garment.</P>
        <div style={s("overflow-x:auto")}>
          <table style={s("width:100%;border-collapse:collapse;min-width:420px;margin-top:6px")}>
            <thead>
              <tr>
                <th style={s(TH)}>SIZE</th>
                <th style={s(TH)}>CHEST</th>
                <th style={s(TH)}>WAIST</th>
                <th style={s(TH)}>BACK LENGTH</th>
              </tr>
            </thead>
            <tbody>
              {ROWS.map((r) => (
                <tr key={r.size}>
                  <td style={s(`${TD};color:#1a1714;font-weight:500`)}>{r.size}</td>
                  <td style={s(TD)}>{r.chest}</td>
                  <td style={s(TD)}>{r.waist}</td>
                  <td style={s(TD)}>{r.length}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </PolicySection>

      <PolicySection heading="How to measure">
        <P>
          <strong>Chest</strong> — around the fullest part, tape level under the arms and relaxed. <strong>Waist</strong>{" "}
          — around your natural waist, roughly an inch above the navel. <strong>Back length</strong> — from the base of
          the neck straight down the spine.
        </P>
      </PolicySection>

      <PolicySection heading="Between sizes?">
        <P>
          Our cuts run true with a little room through the body. If you&apos;re between two sizes, size down for a
          closer fit on tees and size up on knitwear and outerwear, which are meant to layer.
        </P>
      </PolicySection>

      <PolicySection heading="Still unsure">
        <P>
          Email hello@graybridge.example with your usual size in a brand you know well and we&apos;ll tell you what
          we&apos;d send.
        </P>
      </PolicySection>
    </PolicyPage>
  );
}
