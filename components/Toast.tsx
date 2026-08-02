"use client";

import { useStore } from "@/lib/store";
import { s } from "@/lib/style";

export function Toast() {
  const { toast } = useStore();
  if (!toast) return null;
  return (
    <div
      style={s(
        "position:fixed;bottom:26px;left:50%;transform:translateX(-50%);z-index:80;background:#1a1714;color:#fff;padding:13px 22px;border-radius:999px;font-size:14px;font-weight:500;box-shadow:0 16px 40px -16px rgba(0,0,0,.6);animation:gbToast 2.6s both;display:flex;align-items:center;gap:10px",
      )}
    >
      <span style={s("color:#7fd6a8")}>✓</span>
      {toast}
    </div>
  );
}
