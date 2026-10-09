"use client";

import Link from "next/link";
import { assets } from "../../shared/assets";

const FeaturesCollection = () => {
  return (
    <section className="mx-4 mt-16 flex flex-col overflow-hidden rounded-3xl bg-[#effcf6] sm:mx-6 sm:mt-20 lg:mx-auto lg:grid lg:max-w-7xl lg:grid-cols-2">
      <div className="order-2 flex min-h-130 flex-col justify-center px-7 py-14 sm:px-12 sm:py-20 lg:order-1 lg:min-h-175 lg:px-12 xl:px-16">
        <p className="text-base font-semibold text-gray-800">Comfort and Style</p>
        <h2 className="mt-3 max-w-xl text-4xl leading-[1.05] font-bold tracking-tight text-gray-950 sm:text-5xl">
          Apparel made for your everyday life
        </h2>
        <p className="mt-7 max-w-xl text-base leading-7 text-gray-700 sm:text-lg">
          Discover high-quality, comfortable clothing that effortlessly blends
          fashion and function. Designed to make you look and feel great every
          day.
        </p>
        <Link
          href="/shop"
          className="mt-6 inline-flex w-fit rounded-md bg-black px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-gray-800"
        >
          Shop Now
        </Link>
      </div>

      <img
        src={assets.featured}
        alt="People wearing comfortable activewear together"
        className="order-1 h-100 w-full object-cover sm:h-130 lg:order-2 lg:h-full lg:min-h-175"
      />
    </section>
  );
};

export default FeaturesCollection;