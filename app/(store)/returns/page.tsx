import type { Metadata } from "next";
import { PolicyPage, PolicySection, P, Bullets } from "@/components/PolicyPage";

export const metadata: Metadata = {
  title: "Returns — Graybridge",
  description: "Return unworn items within 30 days of delivery.",
};

export default function ReturnsPage() {
  return (
    <PolicyPage
      eyebrow="HELP"
      title="Returns & exchanges"
      intro="Thirty days to change your mind on anything unworn, with tags still on."
      updated="AUGUST 2026"
    >
      <PolicySection heading="The window">
        <P>
          You have 30 days from the delivery date to start a return. After 30 days we can&apos;t accept the item back,
          though we&apos;re always happy to help with a fit or care question.
        </P>
      </PolicySection>

      <PolicySection heading="What we can take back">
        <Bullets
          items={[
            "Unworn and unwashed items with the original tags still attached.",
            "Items free of wear marks, alterations, smoke, or pet hair.",
          ]}
        />
        <P>
          Anything that&apos;s been worn, washed, or altered can&apos;t be resold, so we can&apos;t accept it back. If
          something arrived damaged or isn&apos;t what you ordered, that&apos;s on us — get in touch and we&apos;ll sort
          it out regardless of the condition.
        </P>
      </PolicySection>

      <PolicySection heading="How to start one">
        <P>
          Email us at returns@graybridge.example with your order number (it starts with GB- and is on your confirmation
          email) and which items you&apos;d like to send back. We&apos;ll reply with return instructions.
        </P>
        <P>
          Return shipping is the customer&apos;s responsibility unless the item arrived damaged or incorrect, in which
          case we cover it.
        </P>
      </PolicySection>

      <PolicySection heading="Refunds">
        <P>
          Once your return arrives and passes a quick condition check, we issue a refund to the original payment method.
          Refunds cover the price of the item and any tax charged on it. The original shipping charge isn&apos;t
          refunded unless the return is our error.
        </P>
        <P>
          Refunds typically take a few business days to appear on your statement after we process them, depending on
          your bank.
        </P>
      </PolicySection>

      <PolicySection heading="Exchanges">
        <P>
          For a different size or color, the fastest route is to return the original item and place a new order — that
          way the size you want is reserved for you immediately instead of waiting on the return to arrive.
        </P>
      </PolicySection>
    </PolicyPage>
  );
}
