import type { Metadata } from "next";
import { PolicyPage, PolicySection, P, Bullets } from "@/components/PolicyPage";

export const metadata: Metadata = {
  title: "Shipping — Graybridge",
  description: "Flat $8 shipping anywhere in the US, free on orders over $75.",
};

export default function ShippingPage() {
  return (
    <PolicyPage
      eyebrow="HELP"
      title="Shipping"
      intro="Flat-rate shipping, free once your order passes $75. No surprises at checkout."
      updated="AUGUST 2026"
    >
      <PolicySection heading="Rates">
        <Bullets
          items={[
            <>
              <strong>$8 flat rate</strong> on every order.
            </>,
            <>
              <strong>Free</strong> on orders with a subtotal of $75 or more. If a discount code brings your subtotal
              below $75, the flat rate applies to the discounted amount.
            </>,
          ]}
        />
        <P>
          Rates are the same regardless of how many items are in your order or where in the country it&apos;s going.
          Prices are in US dollars.
        </P>
      </PolicySection>

      <PolicySection heading="Processing and delivery">
        <P>
          Orders are picked and packed from our Pittsburgh workshop. You&apos;ll get a confirmation email as soon as
          your order is placed, and a second message with a carrier and tracking number once it ships.
        </P>
        <P>
          You can check the status of any order at any time from your account&apos;s Orders tab, which shows the same
          tracking information as the email.
        </P>
      </PolicySection>

      <PolicySection heading="Where we ship">
        <P>
          We currently ship within the United States only. Prices, taxes, and the shipping rates above all assume a US
          destination.
        </P>
      </PolicySection>

      <PolicySection heading="Taxes">
        <P>
          Sales tax is calculated at 7% of your order subtotal and shown separately at checkout before you pay.
        </P>
      </PolicySection>
    </PolicyPage>
  );
}
