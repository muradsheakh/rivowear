import type { Metadata } from "next";
import InfoPage from "@/components/Common/InfoPage";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "Demo terms for using the Rivowear storefront.",
};

export default function TermsPage() {
  return (
    <InfoPage
      title="Terms of Service"
      description="Basic terms for using this Rivowear demo storefront."
    >
      <section>
        <h2 className="text-lg font-semibold text-gray-900">Orders and availability</h2>
        <p className="mt-2">
          Product listings, prices, images, and stock in this demo are sample data and may change.
          An order is subject to product availability and confirmation by the store.
        </p>
      </section>
      <section>
        <h2 className="text-lg font-semibold text-gray-900">Payment and delivery</h2>
        <p className="mt-2">
          Cash on delivery is available in the demo. Other payment methods are offered only when
          they have been configured and verified by the store. Delivery charges are shown during
          checkout.
        </p>
      </section>
      <section>
        <h2 className="text-lg font-semibold text-gray-900">Exchanges and support</h2>
        <p className="mt-2">
          The demo exchange window is 7 days from delivery. See Shipping & Returns for current demo
          details, and contact the store before returning or exchanging an item.
        </p>
      </section>
      <p className="rounded-lg bg-amber-50 p-4 text-amber-900">
        Demo terms: have these terms reviewed and replace sample information before taking live
        orders.
      </p>
    </InfoPage>
  );
}
