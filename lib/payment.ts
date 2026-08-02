import { randomUUID } from "node:crypto";

export interface ChargeResult {
  ok: boolean;
  ref: string;
  provider: string;
}

/**
 * No payment processor is wired up yet (no Stripe keys configured). This
 * always "succeeds" so the rest of the order pipeline (persistence, stock,
 * email) can be built and tested end to end. Swap this out once a real
 * processor is connected — do not treat orders placed through here as
 * having collected real money.
 */
export async function chargeOrder(_amountCents: number): Promise<ChargeResult> {
  return { ok: true, ref: `test_${randomUUID()}`, provider: "test-mode" };
}
