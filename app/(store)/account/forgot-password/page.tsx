"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { s } from "@/lib/style";
import { Hv } from "@/components/Hover";

const FIELD_STYLE = "border:1px solid #e0d9cc;border-radius:9px;padding:11px 13px;font-size:14px";
const LABEL_STYLE = "font-size:12px;font-weight:500;color:#5f5a52";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await fetch("/api/account/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      setDone(true);
    } finally {
      setBusy(false);
    }
  };

  return (
    <main style={s("flex:1;display:flex;align-items:center;justify-content:center;padding:60px 24px")}>
      <div style={s("width:380px;background:#fff;border:1px solid #e7e0d3;border-radius:18px;padding:32px;display:flex;flex-direction:column;gap:16px;animation:gbScale .5s both")}>
        <h1 style={s("font-size:22px;font-weight:600;letter-spacing:-.02em;margin:0")}>Reset password</h1>
        {done ? (
          <p style={s("font-size:13.5px;color:#5f5a52;line-height:1.5;margin:0")}>
            If that email is registered, a reset link is on its way. Check your inbox in a minute.
          </p>
        ) : (
          <form onSubmit={submit} style={s("display:flex;flex-direction:column;gap:16px")}>
            <p style={s("font-size:13.5px;color:#5f5a52;line-height:1.5;margin:0")}>
              Enter your email and we&apos;ll send you a link to reset your password.
            </p>
            <div style={s("display:flex;flex-direction:column;gap:6px")}>
              <label style={s(LABEL_STYLE)}>Email</label>
              <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" required autoComplete="email" style={s(FIELD_STYLE)} />
            </div>
            <Hv
              as="button"
              type="submit"
              disabled={busy}
              css="background:#c2410c;color:#fff;border:none;padding:13px;border-radius:9px;font-size:14.5px;font-weight:500;cursor:pointer;transition:background .25s"
              hover="background:#9a330a"
            >
              {busy ? "Sending…" : "Send reset link"}
            </Hv>
          </form>
        )}
        <span onClick={() => router.push("/account/login")} style={s("font-size:12.5px;color:#9a948a;text-align:center;cursor:pointer")}>
          ← Back to sign in
        </span>
      </div>
    </main>
  );
}
