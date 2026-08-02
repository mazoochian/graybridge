"use client";

import { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { s } from "@/lib/style";
import { Hv } from "@/components/Hover";

function SuccessInner() {
  const router = useRouter();
  const params = useSearchParams();
  const order = params.get("order") || "";

  return (
    <main style={s("flex:1;max-width:1080px;margin:0 auto;width:100%;padding:40px 28px 70px")}>
      <div
        style={s(
          "text-align:center;padding:70px 20px;display:flex;flex-direction:column;align-items:center;gap:18px;animation:gbScale .6s both",
        )}
      >
        <div
          style={s(
            "width:72px;height:72px;border-radius:999px;background:#1f513f;display:flex;align-items:center;justify-content:center;color:#fff;font-size:34px",
          )}
        >
          ✓
        </div>
        <h1 style={s("font-size:34px;font-weight:600;letter-spacing:-.02em;margin:0")}>Order confirmed</h1>
        <p style={s("font-size:16px;color:#5f5a52;max-width:440px;margin:0")}>
          Thanks for shopping small. A confirmation is on the way to your inbox.
          {order ? (
            <>
              {" "}
              Order <strong style={s("color:#1a1714")}>#{order}</strong>.
            </>
          ) : null}
        </p>
        <Hv
          as="button"
          onClick={() => router.push("/")}
          css="background:#c2410c;color:#fff;border:none;padding:15px 28px;border-radius:10px;font-size:15px;font-weight:500;cursor:pointer;transition:background .25s;margin-top:8px"
          hover="background:#9a330a"
        >
          Continue shopping
        </Hv>
      </div>
    </main>
  );
}

export default function CheckoutSuccessPage() {
  return (
    <Suspense fallback={null}>
      <SuccessInner />
    </Suspense>
  );
}
