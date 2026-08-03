"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useStore } from "@/lib/store";
import { s } from "@/lib/style";
import { Hv } from "@/components/Hover";

const FIELD_STYLE = "border:1px solid #e0d9cc;border-radius:9px;padding:11px 13px;font-size:14px";
const LABEL_STYLE = "font-size:12px;font-weight:500;color:#5f5a52";

export default function AccountLoginPage() {
  const router = useRouter();
  const { refreshCustomer } = useStore();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/account/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data?.error || "Could not sign in.");
        return;
      }
      await refreshCustomer();
      router.push("/account");
    } catch {
      setError("Could not reach the server.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <main style={s("flex:1;display:flex;align-items:center;justify-content:center;padding:60px 24px")}>
      <form
        onSubmit={submit}
        style={s("width:380px;background:#fff;border:1px solid #e7e0d3;border-radius:18px;padding:32px;display:flex;flex-direction:column;gap:16px;animation:gbScale .5s both")}
      >
        <h1 style={s("font-size:22px;font-weight:600;letter-spacing:-.02em;margin:0")}>Sign in</h1>
        <div style={s("display:flex;flex-direction:column;gap:6px")}>
          <label style={s(LABEL_STYLE)}>Email</label>
          <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" required autoComplete="email" style={s(FIELD_STYLE)} />
        </div>
        <div style={s("display:flex;flex-direction:column;gap:6px")}>
          <label style={s(LABEL_STYLE)}>Password</label>
          <input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            type="password"
            required
            autoComplete="current-password"
            style={s(FIELD_STYLE)}
          />
        </div>
        {error ? (
          <div style={s("font-size:12.5px;color:#b3402a;background:#f7e6e1;padding:9px 12px;border-radius:8px")}>{error}</div>
        ) : null}
        <Hv
          as="button"
          type="submit"
          disabled={busy}
          css="background:#c2410c;color:#fff;border:none;padding:13px;border-radius:9px;font-size:14.5px;font-weight:500;cursor:pointer;transition:background .25s"
          hover="background:#9a330a"
        >
          {busy ? "Signing in…" : "Sign in"}
        </Hv>
        <div style={s("display:flex;justify-content:space-between;font-size:12.5px;color:#8a8275")}>
          <span onClick={() => router.push("/account/forgot-password")} style={s("cursor:pointer")}>
            Forgot password?
          </span>
          <span onClick={() => router.push("/account/signup")} style={s("cursor:pointer;color:#c2410c")}>
            Create account
          </span>
        </div>
      </form>
    </main>
  );
}
