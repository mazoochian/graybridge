import { s } from "@/lib/style";

// Currently unused on purpose: Graybridge is still in payment test-mode
// (lib/payment.ts always "succeeds" — no Stripe/other processor is wired
// up), and rendering these brand marks on the cart page / footer implied
// real payment support that doesn't exist yet, which is a misleading
// trust signal. Re-wire <PayMarks /> back in once a real processor is
// connected.
const SVGS: Record<string, string> = {
  visa:
    '<svg width="30" height="12" viewBox="0 0 30 12"><text x="0" y="11" font-family="Geist,sans-serif" font-size="12" font-style="italic" font-weight="700" fill="#1a3a8f">VISA</text></svg>',
  mc:
    '<svg width="28" height="18" viewBox="0 0 28 18"><circle cx="10.5" cy="9" r="7" fill="#eb001b"/><circle cx="17.5" cy="9" r="7" fill="#f79e1b" opacity="0.9"/></svg>',
  amex:
    '<svg width="32" height="12" viewBox="0 0 32 12"><rect width="32" height="12" rx="2" fill="#1e6cd9"/><text x="16" y="9" text-anchor="middle" font-family="Geist,sans-serif" font-size="6.5" font-weight="700" fill="#fff">AMEX</text></svg>',
  paypal:
    '<svg width="34" height="12" viewBox="0 0 34 12"><text x="0" y="11" font-family="Geist,sans-serif" font-size="11" font-style="italic" font-weight="700" fill="#003087">Pay</text><text x="18" y="11" font-family="Geist,sans-serif" font-size="11" font-style="italic" font-weight="700" fill="#009cde">Pal</text></svg>',
  apple:
    '<svg width="34" height="15" viewBox="0 0 34 15"><path d="M6.6 4c.45-.55.75-1.3.65-2.05-.65.03-1.4.45-1.85 1-.4.48-.76 1.24-.66 1.97.72.06 1.42-.37 1.86-.92zM8.05 4.9c-1.03-.06-1.9.58-2.39.58-.5 0-1.25-.56-2.06-.55-1.06.02-2.04.62-2.58 1.57-1.1 1.9-.28 4.72.79 6.27.52.76 1.14 1.6 1.96 1.57.78-.03 1.08-.5 2.02-.5.94 0 1.2.5 2.02.49.84-.02 1.36-.77 1.87-1.53.59-.87.83-1.72.84-1.76-.02-.01-1.61-.62-1.63-2.45-.02-1.53 1.25-2.26 1.3-2.3-.71-1.05-1.82-1.17-2.13-1.46z" fill="#000"/><text x="13" y="11" font-family="Geist,sans-serif" font-size="10" font-weight="600" fill="#000">Pay</text></svg>',
  gpay:
    '<svg width="34" height="14" viewBox="0 0 34 14"><text x="0" y="11" font-family="Geist,sans-serif" font-size="11" font-weight="500" fill="#5f6368">G</text><text x="8" y="11" font-family="Geist,sans-serif" font-size="11" font-weight="500" fill="#4285f4">P</text><text x="15" y="11" font-family="Geist,sans-serif" font-size="11" font-weight="500" fill="#5f6368">ay</text></svg>',
};

const MARK =
  "display:inline-flex;align-items:center;justify-content:center;width:42px;height:27px;border-radius:5px;background:#fff;border:1px solid #e0d9cc";

export function PayMarks() {
  return (
    <>
      {Object.entries(SVGS).map(([key, svg]) => (
        <span key={key} style={s(MARK)} dangerouslySetInnerHTML={{ __html: svg }} />
      ))}
    </>
  );
}
