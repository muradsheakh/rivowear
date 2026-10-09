"use client";

import { FiPhone } from "react-icons/fi";
import Link from "next/link";

const Footer = () => {
  return (
    <footer className="border-t border-gray-200 bg-white">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 min-[375px]:px-5 min-[425px]:px-6 sm:grid-cols-2 sm:px-8 lg:grid-cols-4 lg:gap-16 lg:px-10">
        <section className="min-w-0">
          <h2 className="text-lg font-medium text-gray-900">Newsletter</h2>
          <p className="mt-5 max-w-sm text-sm leading-6 text-gray-500">
            Be the first to hear about new products, exclusive events, and
            online offers.
          </p>
          <p className="mt-4 text-sm text-gray-600">
            Newsletter signup is not enabled in this demo yet.
          </p>
        </section>

        <section className="min-w-0">
          <h2 className="text-lg font-medium text-gray-900">Shop</h2>
          <nav className="mt-5 space-y-3">
            {[
              { label: "Men's Top Wear", href: "/shop?gender=men&category=top-wear" },
              { label: "Women's Top Wear", href: "/shop?gender=women&category=top-wear" },
              { label: "Men's Bottom Wear", href: "/shop?gender=men&category=bottom-wear" },
              { label: "Women's Bottom Wear", href: "/shop?gender=women&category=bottom-wear" },
            ].map((item) => (
              <Link
                key={item.label}
                href={item.href}
                className="block text-sm text-gray-600 transition-colors hover:text-black"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </section>

        <section className="min-w-0">
          <h2 className="text-lg font-medium text-gray-900">Support</h2>
          <nav className="mt-5 space-y-3">
            {[
              { label: "Contact Us", href: "/contact" },
              { label: "About Us", href: "/about" },
              { label: "FAQs", href: "/faq" },
              { label: "Shipping & Returns", href: "/shipping-returns" },
              { label: "Privacy Policy", href: "/privacy" },
              { label: "Terms of Service", href: "/terms" },
              { label: "Features", href: "/#features" },
            ].map((item) => (
              <Link
                key={item.label}
                href={item.href}
                className="block text-sm text-gray-600 transition-colors hover:text-black"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </section>

        <section className="min-w-0">
          <h2 className="text-lg font-medium text-gray-900">Talk to us</h2>
          <Link href="/contact" className="mt-5 block text-sm text-gray-600 transition-colors hover:text-black">
            Contact store support
          </Link>
          <p className="mt-8 text-sm text-gray-600">Call us</p>
          <a
            href="tel:+8801701979554"
            className="mt-2 flex flex-wrap items-center gap-3 text-lg font-semibold text-gray-900 break-all"
          >
            <FiPhone className="h-5 w-5" />
            +8801701979554
          </a>
        </section>
      </div>

      <div className="mx-auto max-w-7xl border-t border-gray-200 px-4 py-7 text-center text-sm text-gray-500 min-[375px]:px-5 min-[425px]:px-6 sm:px-8 lg:px-10">
        © 2026, Rivowear. All Rights Reserved.
      </div>
    </footer>
  );
};

export default Footer;
