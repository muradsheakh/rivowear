import type { Metadata } from "next";
import Link from "next/link";
import InfoPage from "@/components/Common/InfoPage";

export const metadata: Metadata = {
  title: "Frequently Asked Questions",
  description: "Answers about shopping, delivery, payment, and order tracking at Rivowear.",
};

const questions = [
  {
    question: "How do I place an order?",
    answer: "Choose a product, select an available size and colour, add it to your cart, and follow the checkout steps.",
  },
  {
    question: "Which payment methods are available?",
    answer: "Cash on delivery is available in the demo. Other methods appear only when configured by the store.",
  },
  {
    question: "How much is delivery?",
    answer: "The current demo checkout charges ৳70 inside Dhaka and ৳130 outside Dhaka, with free delivery over ৳5,000. The checkout shows the applicable charge.",
  },
  {
    question: "How can I track my order?",
    answer: "Use the tracking ID from your order confirmation on the Track Order page.",
  },
  {
    question: "Can I exchange an item?",
    answer: "The demo exchange window is 7 days after delivery. Contact support with your order details to confirm eligibility and the next steps.",
  },
  {
    question: "Will I receive SMS updates?",
    answer: "SMS updates depend on the store's SMS provider configuration. During the demo, messages may be logged by the server rather than delivered to a phone.",
  },
];

export default function FaqPage() {
  return (
    <InfoPage title="Frequently Asked Questions" description="Quick answers to common questions about shopping with Rivowear.">
      <div className="divide-y divide-gray-200 border-y border-gray-200">
        {questions.map(({ question, answer }) => (
          <details key={question} className="group py-5">
            <summary className="cursor-pointer list-none pr-6 font-medium text-gray-900 marker:hidden">
              {question}
            </summary>
            <p className="mt-3 text-gray-600">{answer}</p>
          </details>
        ))}
      </div>
      <p>
        Still need help? <Link href="/contact" className="font-medium underline">Contact us</Link>.
      </p>
    </InfoPage>
  );
}
