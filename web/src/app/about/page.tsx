import type { Metadata } from "next";
import Link from "next/link";
import InfoPage from "@/components/Common/InfoPage";

export const metadata: Metadata = {
  title: "About Rivowear",
  description: "Learn about Rivowear and browse everyday clothing for men and women.",
};

export default function AboutPage() {
  return (
    <InfoPage
      title="About Rivowear"
      description="A simple place to discover everyday clothing for men and women."
    >
      <section>
        <h2 className="text-lg font-semibold text-gray-900">Clothing for everyday life</h2>
        <p className="mt-2">
          Rivowear brings clothing collections together in one easy-to-use online store. Browse by
          gender, category, colour, or price, then check the available sizes and colours on each
          product page.
        </p>
      </section>
      <section>
        <h2 className="text-lg font-semibold text-gray-900">Shopping with Rivowear</h2>
        <p className="mt-2">
          The demo storefront supports customer accounts, order tracking, and cash on delivery.
          Product and delivery information is shown during shopping and checkout.
        </p>
      </section>
      <p>
        Have a question? <Link href="/contact" className="font-medium underline">Contact our support team</Link>.
      </p>
    </InfoPage>
  );
}
