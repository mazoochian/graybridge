import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "@/lib/store";

export const metadata: Metadata = {
  title: "Graybridge — Considered essentials, made to last",
  description:
    "Honest, durable everyday clothing in organic and recycled fibers — designed, cut, and finished in small batches in Pittsburgh.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
