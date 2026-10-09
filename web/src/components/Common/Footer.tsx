"use client";

import { FiInstagram, FiPhone } from "react-icons/fi";
import { FaXTwitter } from "react-icons/fa6";
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
          <p className="mt-4 text-sm font-medium text-gray-700">
            Sign up and get 10% off your first order.
          </p>
          <form
            className="mt-6 flex max-w-md"
            onSubmit={(event) => event.preventDefault()}
          >
            <label htmlFor="newsletter-email" className="sr-only">
              Email address
            </label>
            <input
              id="newsletter-email"
              type="email"
              placeholder="Enter your email"
              required
              className="min-w-0 flex-1 rounded-l-md border border-gray-300 px-3 py-3 text-sm outline-none placeholder:text-gray-400 focus:border-black"
            />
            <button
              type="submit"
              className="rounded-r-md bg-black px-5 py-3 text-sm font-medium text-white transition-colors hover:bg-gray-800"
            >
              Subscribe
            </button>
          </form>
        </section>

        <section className="min-w-0">
          <h2 className="text-lg font-medium text-gray-900">Shop</h2>
          <nav className="mt-5 space-y-3">
            {[
              "Men's Top Wear",
              "Women's Top Wear",
              "Men's Bottom Wear",
              "Women's Bottom Wear",
            ].map((item) => (
              <Link
                key={item}
                href="#"
                className="block text-sm text-gray-600 transition-colors hover:text-black"
              >
                {item}
              </Link>
            ))}
          </nav>
        </section>

        <section className="min-w-0">
          <h2 className="text-lg font-medium text-gray-900">Support</h2>
          <nav className="mt-5 space-y-3">
            {["Contact Us", "About Us", "FAQs", "Features"].map((item) => (
              <Link
                key={item}
                href="#"
                className="block text-sm text-gray-600 transition-colors hover:text-black"
              >
                {item}
              </Link>
            ))}
          </nav>
        </section>

        <section className="min-w-0">
          <h2 className="text-lg font-medium text-gray-900">Follow Us</h2>
          <div className="mt-5 flex items-center gap-5">
            <a href="#" aria-label="Follow us on Threads" className="text-gray-800 transition-colors hover:text-gray-500">
              <span className="text-xl font-medium">∞</span>
            </a>
            <a href="#" aria-label="Follow us on Instagram" className="text-gray-800 transition-colors hover:text-gray-500">
              <FiInstagram className="h-5 w-5" />
            </a>
            <a href="#" aria-label="Follow us on X" className="text-gray-800 transition-colors hover:text-gray-500">
              <FaXTwitter className="h-4 w-4" />
            </a>
          </div>
          <p className="mt-8 text-sm text-gray-600">Call Us</p>
          <a
            href="tel:0123456789"
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
