import type { Metadata } from "next";
import { PolicyPage, PolicySection, P, Bullets } from "@/components/PolicyPage";

export const metadata: Metadata = {
  title: "Contact — Graybridge",
  description: "How to reach the Graybridge team.",
};

export default function ContactPage() {
  return (
    <PolicyPage
      eyebrow="HELP"
      title="Contact"
      intro="A small team in Pittsburgh reads every message. We aim to reply within one business day."
    >
      <PolicySection heading="Email">
        <Bullets
          items={[
            <>
              Orders, sizing, and general questions — <strong>hello@graybridge.example</strong>
            </>,
            <>
              Returns and exchanges — <strong>returns@graybridge.example</strong>
            </>,
            <>
              Privacy and data requests — <strong>privacy@graybridge.example</strong>
            </>,
          ]}
        />
        <P>
          If your message is about an existing order, including the order number (it starts with GB-) gets you a faster
          answer.
        </P>
      </PolicySection>

      <PolicySection heading="Workshop">
        <P>
          2231 Penn Avenue
          <br />
          Pittsburgh, PA
        </P>
        <P>
          The workshop isn&apos;t a retail store and isn&apos;t staffed for walk-ins, but mail and returns sent here do
          reach us.
        </P>
      </PolicySection>

      <PolicySection heading="Before you write">
        <P>
          Shipping rates and delivery timing are covered on the shipping page, the return window and condition rules are
          on the returns page, and measurements are on the size guide — those answer most of what comes in.
        </P>
      </PolicySection>
    </PolicyPage>
  );
}
