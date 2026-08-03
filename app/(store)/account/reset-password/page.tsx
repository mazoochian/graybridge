"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useStore } from "@/lib/store";
import { s } from "@/lib/style";
import { Hv } from "@/components/Hover";

const FIELD_STYLE = "border:1px solid #e0d9cc;border-radius:9px;padding:11px 13px;font-size:14px";
const LABEL_STYLE = "font-size:12px;font-weight:500;color:#5f5a52";

function ResetInner() {
  const router = useRouter();
  const params = useSearchParams();
  const token = params.get("token") || "";
  const { refreshCustomer } = useStore();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/account/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data?.error || "Could not reset password.");
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
      <div style={s("width:380px;background:#fff;border:1px solid #e7e0d3;border-radius:18px;padding:32px;display:flex;flex-direction:column;gap:16px;animation:gbScale .5s both")}>
        <h1 style={s("font-size:22px;font-weight:600;letter-spacing:-.02em;margin:0")}>Set a new password</h1>
        {!token ? (
          <div style={s("font-size:12.5px;color:#b3402a;background:#f7e6e1;padding:9px 12px;border-radius:8px")}>
            Missing reset token. Use the link from your email.
          </div>
        ) : (
          <form onSubmit={submit} style={s("display:flex;flex-direction:column;gap:16px")}>
            <div style={s("display:flex;flex-direction:column;gap:6px")}>
              <label style={s(LABEL_STYLE)}>New password</label>
              <input
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                type="password"
                required
                minLength={8}
                autoComplete="new-password"
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
              {busy ? "Saving…" : "Save new password"}
            </Hv>
          </form>
        )}
      </div>
    </main>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetInner />
    </Suspense>
  );
}
