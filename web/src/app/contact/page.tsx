import type { Metadata } from "next";
import InfoPage from "@/components/Common/InfoPage";
import { getSettingsServer } from "@/shared/api/server";

export const metadata: Metadata = {
  title: "Contact Rivowear",
  description: "Contact Rivowear support about products and orders.",
};

export const dynamic = "force-dynamic";

export default async function ContactPage() {
  const settings = await getSettingsServer();

  return (
    <InfoPage title="Contact Us" description="Need help with a product or order? Get in touch with the store.">
      <section className="rounded-xl border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900">Store support</h2>
        {settings ? (
          <dl className="mt-4 space-y-4">
            <div>
              <dt className="font-medium text-gray-900">Phone</dt>
              <dd><a className="underline" href={`tel:${settings.phone.replace(/[^\d+]/g, "")}`}>{settings.phone}</a></dd>
            </div>
            {settings.email && (
              <div>
                <dt className="font-medium text-gray-900">Email</dt>
                <dd><a className="underline" href={`mailto:${settings.email}`}>{settings.email}</a></dd>
              </div>
            )}
            {settings.address && (
              <div>
                <dt className="font-medium text-gray-900">Address</dt>
                <dd>{settings.address}</dd>
              </div>
            )}
            {settings.whatsappNumber && (
              <div>
                <dt className="font-medium text-gray-900">WhatsApp</dt>
                <dd>
                  <a
                    className="underline"
                    href={`https://wa.me/${settings.whatsappNumber.replace(/\D/g, "")}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Message Rivowear on WhatsApp
                  </a>
                </dd>
              </div>
            )}
          </dl>
        ) : (
          <p className="mt-3">Store contact details are temporarily unavailable. Please try again later.</p>
        )}
      </section>
      <p>For order questions, include the order tracking ID in your message. Never send your password or payment credentials.</p>
    </InfoPage>
  );
}
