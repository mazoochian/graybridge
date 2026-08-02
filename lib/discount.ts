import type { PrismaClient } from "@/lib/generated/prisma/client";

type DiscountClient = Pick<PrismaClient, "discountCode">;

export interface DiscountValidation {
  valid: boolean;
  message?: string;
  discountAmount: number;
  normalizedCode: string;
}

export function normalizeCode(raw: string): string {
  return raw.trim().toUpperCase();
}

export async function validateDiscountCode(db: DiscountClient, rawCode: string, subtotal: number): Promise<DiscountValidation> {
  const normalizedCode = normalizeCode(rawCode);
  if (!normalizedCode) return { valid: false, message: "Enter a code.", discountAmount: 0, normalizedCode };

  const record = await db.discountCode.findUnique({ where: { code: normalizedCode } });
  if (!record) return { valid: false, message: "That code isn't valid.", discountAmount: 0, normalizedCode };
  if (!record.active) return { valid: false, message: "That code is no longer active.", discountAmount: 0, normalizedCode };
  if (record.expiresAt && record.expiresAt < new Date()) {
    return { valid: false, message: "That code has expired.", discountAmount: 0, normalizedCode };
  }
  if (record.usageLimit != null && record.usedCount >= record.usageLimit) {
    return { valid: false, message: "That code has reached its usage limit.", discountAmount: 0, normalizedCode };
  }
  if (subtotal < record.minSubtotal) {
    return {
      valid: false,
      message: `Add $${(record.minSubtotal - subtotal).toFixed(2)} more to use this code.`,
      discountAmount: 0,
      normalizedCode,
    };
  }

  const discountAmount = record.type === "percent" ? Math.round(subtotal * (record.value / 100) * 100) / 100 : Math.min(record.value, subtotal);
  return { valid: true, discountAmount, normalizedCode };
}
