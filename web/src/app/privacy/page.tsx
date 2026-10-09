import type { Metadata } from "next";
import InfoPage from "@/components/Common/InfoPage";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "Demo privacy information for Rivowear customers.",
};

export default function PrivacyPage() {
  return (
    <InfoPage
      title="Privacy Policy"
      description="How this demo store handles information used to fulfil and support orders."
    >
      <section>
        <h2 className="text-lg font-semibold text-gray-900">Information used by the store</h2>
        <p className="mt-2">
          Account and checkout details such as your name, contact information, delivery address,
          cart, and order history are used to provide store services, process orders, and help with
          support requests. Passwords are stored as password hashes, not as plain text.
        </p>
      </section>
      <section>
        <h2 className="text-lg font-semibold text-gray-900">Service providers and messages</h2>
        <p className="mt-2">
          The demo uses hosted infrastructure for the website, API, and database. If messaging or
          payment providers are configured, relevant details may be sent to them to deliver that
          service. Do not use real customer information in this demo.
        </p>
      </section>
      <section>
        <h2 className="text-lg font-semibold text-gray-900">Requests about your data</h2>
        <p className="mt-2">
          Contact the store using the details on the Contact Us page to ask about your account or
          order information. Data retention, deletion, and legal requirements must be reviewed
          before production use.
        </p>
      </section>
      <p className="rounded-lg bg-amber-50 p-4 text-amber-900">
        Demo policy: this is not a final legal notice. Publish a reviewed policy that matches your
        business and applicable law before collecting real customer data.
      </p>
    </InfoPage>
  );
}
