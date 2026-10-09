"use client";

import Link from "next/link";
import { assets } from "../../shared/assets";

const collections = [
  {
    title: "Women's Collection",
    image: assets.womensCollection,
    link: "/collections/all?gender=women",
  },
  {
    title: "Men's Collection",
    image: assets.mensCollection,
    link: "/collections/all?gender=men",
  },
];

const GenderCollection = () => {
  return (
    <section className="mx-auto grid max-w-7xl gap-6 px-6 py-16 sm:gap-8 sm:py-20 md:grid-cols-2">
      {collections.map((collection) => (
        <article key={collection.title} className="group relative overflow-hidden">
          <img
            src={collection.image}
            alt={collection.title}
            className="h-115 w-full object-cover transition-transform duration-500 group-hover:scale-105 sm:h-140 lg:h-175"
          />
          <div className="absolute inset-x-6 bottom-6 bg-white/95 p-5 sm:inset-x-8 sm:bottom-8 sm:p-6">
            <h2 className="text-xl font-bold text-gray-900 sm:text-2xl">
              {collection.title}
            </h2>
            <Link
              href={collection.link}
              className="mt-3 inline-block text-sm font-medium text-gray-800 underline underline-offset-4 transition-colors hover:text-rabbit-red"
            >
              Shop Now
            </Link>
          </div>
        </article>
      ))}
    </section>
  );
};

export default GenderCollection;
