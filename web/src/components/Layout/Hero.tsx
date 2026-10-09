"use client";

import Link from "next/link";
import { assets } from "../../shared/assets";

const Hero = () => {
  return (
       <main>
      <section className="relative isolate min-h-130 overflow-hidden sm:min-h-155 lg:min-h-[calc(100vh-104px)]">
        <img
          src={assets.rabbitHero}
          alt="People enjoying a sunny vacation by the beach"
          className="absolute inset-0 -z-20 h-full w-full object-cover object-center"
        />
        <div className="absolute inset-0 -z-10 bg-black/35" />

        <div className="mx-auto flex min-h-130 max-w-7xl items-center justify-center px-6 py-20 text-center text-white sm:min-h-155 lg:min-h-[calc(100vh-104px)]">
          <div className="max-w-3xl">
            <p className="mb-4 text-sm font-medium uppercase tracking-[0.3em] sm:text-base">
              New season collection
            </p>
            <h1 className="text-5xl font-bold uppercase leading-[0.95] tracking-tight sm:text-7xl lg:text-8xl">
              Vacation
              <span className="block">Ready</span>
            </h1>
            <p className="mx-auto mt-6 max-w-xl text-sm leading-6 text-white/90 sm:text-base">
              Explore our vacation-ready outfits with fast worldwide shipping.
            </p>
            <Link
              href="/shop"
              className="mt-8 inline-flex bg-white px-8 py-3 text-sm font-medium text-gray-900 transition-colors hover:bg-gray-100"
            >
              Shop Now
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
};

export default Hero;