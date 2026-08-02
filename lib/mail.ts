import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

export interface OrderConfirmationInput {
  orderNumber: string;
  email: string;
  name: string;
  items: { name: string; size: string; color: string; qty: number; unitPrice: number }[];
  subtotal: number;
  shipping: number;
  tax: number;
  total: number;
}

/**
 * Sends a real email via Resend if RESEND_API_KEY is set. Otherwise (the
 * default right now — no email provider configured) writes the message to
 * local-mail/ and logs it, so email flows are still visible and testable
 * without a real provider.
 */
async function sendMail(opts: { to: string; subject: string; text: string; fileTag: string }): Promise<void> {
  if (process.env.RESEND_API_KEY) {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: process.env.MAIL_FROM || "orders@graybridge.example",
        to: opts.to,
        subject: opts.subject,
        text: opts.text,
      }),
    });
    if (!res.ok) {
      console.error(`[mail] Resend send failed for ${opts.fileTag}: ${res.status} ${await res.text()}`);
    }
    return;
  }

  const dir = path.join(process.cwd(), "local-mail");
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, `${opts.fileTag}.txt`), `To: ${opts.to}\nSubject: ${opts.subject}\n\n${opts.text}`);
  console.log(`[mail:dev] No RESEND_API_KEY set — wrote "${opts.subject}" for ${opts.to} to local-mail/${opts.fileTag}.txt`);
}

function renderOrderBody(order: OrderConfirmationInput): string {
  const lines = order.items
    .map((i) => `  ${i.qty} x ${i.name} (${i.color}, size ${i.size}) — $${(i.unitPrice * i.qty).toFixed(2)}`)
    .join("\n");
  return [
    `Hi ${order.name},`,
    "",
    `Thanks for your order — ${order.orderNumber} is confirmed.`,
    "",
    lines,
    "",
    `Subtotal: $${order.subtotal.toFixed(2)}`,
    `Shipping: $${order.shipping.toFixed(2)}`,
    `Tax: $${order.tax.toFixed(2)}`,
    `Total: $${order.total.toFixed(2)}`,
    "",
    "— graybridge",
  ].join("\n");
}

export async function sendOrderConfirmation(order: OrderConfirmationInput): Promise<void> {
  await sendMail({
    to: order.email,
    subject: `Your graybridge order ${order.orderNumber} is confirmed`,
    text: renderOrderBody(order),
    fileTag: order.orderNumber,
  });
}

export async function sendPasswordReset(opts: { email: string; name: string; resetUrl: string }): Promise<void> {
  const text = [
    `Hi ${opts.name},`,
    "",
    "We received a request to reset your graybridge password. This link is valid for 1 hour:",
    "",
    opts.resetUrl,
    "",
    "If you didn't ask for this, you can ignore this email.",
    "",
    "— graybridge",
  ].join("\n");
  await sendMail({
    to: opts.email,
    subject: "Reset your graybridge password",
    text,
    fileTag: `reset-${Date.now()}`,
  });
}
