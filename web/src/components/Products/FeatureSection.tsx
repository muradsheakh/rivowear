"use client";

import { FiCreditCard, FiRefreshCw, FiShoppingBag } from "react-icons/fi";

const features = [
  {
    title: "Delivery across Bangladesh",
    description: "Dhaka from ৳70 · outside Dhaka from ৳130",
    icon: FiShoppingBag,
  },
  {
    title: "7 days exchange",
    description: "Contact support within 7 days of delivery",
    icon: FiRefreshCw,
  },
  {
    title: "Secure checkout",
    description: "100% secured checkout process",
    icon: FiCreditCard,
  },
];

const FeatureSection = () => {
  return (
    <section
      id="features"
      aria-label="Shopping benefits"
      className="mx-auto grid max-w-7xl grid-cols-1 gap-12 px-6 py-16 sm:grid-cols-3 sm:gap-6 sm:px-8 sm:py-20 lg:px-10"
    >
      {features.map(({ title, description, icon: Icon }) => (
        <article key={title} className="flex flex-col items-center text-center">
          <Icon
            aria-hidden="true"
            className="h-6 w-6 stroke-[1.8] text-gray-900"
          />
          <h2 className="mt-8 text-base font-medium tracking-tight text-gray-900 uppercase">
            {title}
          </h2>
          <p className="mt-3 text-base text-gray-600">{description}</p>
        </article>
      ))}
    </section>
  );
};

export default FeatureSection;
