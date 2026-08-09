import type { Metadata } from "next";
import { PolicyPage, PolicySection, P } from "@/components/PolicyPage";

export const metadata: Metadata = {
  title: "Terms — Graybridge",
  description: "The terms that apply when you buy from Graybridge.",
};

// NOTE: not reviewed by a lawyer. See ROADMAP.md — a real legal review is
// required before the store takes live orders.
export default function TermsPage() {
  return (
    <PolicyPage
      eyebrow="LEGAL"
      title="Terms of sale"
      intro="The short version of what you can expect from us, and what we expect in return."
      updated="AUGUST 2026"
    >
      <PolicySection heading="Orders">
        <P>
          Placing an order is an offer to buy. We accept it when we send your order confirmation email. If an item turns
          out to be unavailable after you order — stock is finite and occasionally two people reach the last one at
          once — we&apos;ll tell you and refund that item in full.
        </P>
      </PolicySection>

      <PolicySection heading="Pricing">
        <P>
          Prices are in US dollars and shown before tax and shipping, both of which are added at checkout so you see the
          full total before paying. We try hard to keep prices accurate, but if an item is listed at an obviously wrong
          price we may cancel the order and refund you rather than honor it.
        </P>
      </PolicySection>

      <PolicySection heading="Discount codes">
        <P>
          Codes apply to your order subtotal, can&apos;t be combined unless we say so, and may have an expiry date or a
          limit on total uses. We can withdraw a code at any time, but never retroactively on an order that&apos;s
          already been placed.
        </P>
      </PolicySection>

      <PolicySection heading="Your account">
        <P>
          You&apos;re responsible for keeping your password to yourself and for what happens under your account. Tell us
          promptly if you think someone else has access to it.
        </P>
      </PolicySection>

      <PolicySection heading="Returns">
        <P>
          Our returns policy forms part of these terms and sets out the window and condition requirements for sending
          something back. Nothing here limits your statutory rights as a consumer.
        </P>
      </PolicySection>

      <PolicySection heading="Product descriptions">
        <P>
          We photograph and describe our garments as accurately as we can. Colors can still vary a little between
          screens, and natural fibers vary a little between batches — that&apos;s a property of the material, not a
          fault.
        </P>
      </PolicySection>

      <PolicySection heading="Changes">
        <P>
          We may update these terms. The version that applies to your order is the one published when you placed it.
        </P>
      </PolicySection>

      <PolicySection heading="Contact">
        <P>Questions about these terms go to hello@graybridge.example.</P>
      </PolicySection>
    </PolicyPage>
  );
}
