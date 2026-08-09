import type { Metadata } from "next";
import { PolicyPage, PolicySection, P, Bullets } from "@/components/PolicyPage";

export const metadata: Metadata = {
  title: "Privacy — Graybridge",
  description: "What data Graybridge collects, why, and how long it's kept.",
};

// The content below describes what this application actually does — it was
// written against the real schema (prisma/schema.prisma), the real session
// cookies (lib/auth.ts, lib/customer-auth.ts) and the real outbound
// integrations (lib/mail.ts, Sentry). Keep it that way: if the data model
// or a third-party integration changes, this page needs updating too.
// NOTE: this has not been reviewed by a lawyer. See ROADMAP.md — a real
// legal review is required before the store takes live orders.
export default function PrivacyPage() {
  return (
    <PolicyPage
      eyebrow="LEGAL"
      title="Privacy"
      intro="We collect what we need to send you your order, and not much else."
      updated="AUGUST 2026"
    >
      <PolicySection heading="What we collect">
        <P>When you place an order, we store:</P>
        <Bullets
          items={[
            "Your name and email address.",
            "The shipping address and phone number you enter at checkout.",
            "What you ordered, the amounts charged, and any discount code applied.",
            "Carrier and tracking details once your order ships.",
          ]}
        />
        <P>If you create an account, we also store:</P>
        <Bullets
          items={[
            "Your password, hashed with bcrypt — we never store or have access to the plain text.",
            "Any saved addresses you add to your address book.",
            "Your wishlist.",
          ]}
        />
      </PolicySection>

      <PolicySection heading="Payment details">
        <P>
          We do not collect, store, or process card numbers on our own systems. Card details are handled entirely by our
          payment processor.
        </P>
      </PolicySection>

      <PolicySection heading="Cookies">
        <P>
          We use one cookie to keep you signed in. It holds a signed session token, is marked HttpOnly so page scripts
          can&apos;t read it, and expires after 30 days. Signing out clears it.
        </P>
        <P>We don&apos;t use advertising or cross-site tracking cookies.</P>
      </PolicySection>

      <PolicySection heading="Who else sees your data">
        <Bullets
          items={[
            "Our email provider, to deliver order confirmations and password reset emails.",
            "Our payment processor, to take payment.",
            "Our shipping carrier, to deliver your order.",
            "Our error-monitoring service, which records technical details when something breaks on the site so we can fix it.",
          ]}
        />
        <P>We do not sell your personal information, and we don&apos;t share it for anyone else&apos;s marketing.</P>
      </PolicySection>

      <PolicySection heading="How long we keep it">
        <P>
          Order records are kept as business records, since we need them for accounting and to help with any later
          question about a past order. Account details are kept until you ask us to delete your account. Password reset
          links expire one hour after they&apos;re requested and can only be used once.
        </P>
      </PolicySection>

      <PolicySection heading="Your choices">
        <P>
          You can view and update your name, addresses, and wishlist from your account at any time. To request a copy of
          your data or ask us to delete your account, email privacy@graybridge.example and we&apos;ll take care of it.
        </P>
      </PolicySection>

      <PolicySection heading="Contact">
        <P>Questions about any of this go to privacy@graybridge.example.</P>
      </PolicySection>
    </PolicyPage>
  );
}
