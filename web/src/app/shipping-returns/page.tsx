import type { Metadata } from "next";
import InfoPage from "@/components/Common/InfoPage";

export const metadata: Metadata = {
  title: "Shipping & Returns",
  description: "Demo shipping and exchange information for Rivowear orders in Bangladesh.",
};

export default function ShippingReturnsPage() {
  return (
    <InfoPage
      title="Shipping & Returns"
      description="Delivery and exchange information for Rivowear orders."
    >
      <section>
        <h2 className="text-lg font-semibold text-gray-900">Delivery</h2>
        <p className="mt-2">
          We currently deliver across Bangladesh. The demo checkout uses a delivery charge of ৳70
          inside Dhaka and ৳130 outside Dhaka. Delivery is free for orders over ৳5,000. The final
          charge is shown at checkout.
        </p>
      </section>
      <section>
        <h2 className="text-lg font-semibold text-gray-900">Exchanges</h2>
        <p className="mt-2">
          The current demo store allows exchange requests within 7 days of delivery. Keep your
          invoice and contact support with your order details so the team can confirm the next
          steps. Eligibility and item condition requirements should be confirmed with the store
          before launch.
        </p>
      </section>
      <p className="rounded-lg bg-amber-50 p-4 text-amber-900">
        Demo policy: review delivery charges, exchange eligibility, and timing before accepting
        real customer orders.
      </p>
    </InfoPage>
  );
}
