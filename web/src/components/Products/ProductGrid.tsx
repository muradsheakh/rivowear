"use client";

import { money } from "../../shared/money";
import { FaHeart, FaRegHeart } from "react-icons/fa";
import Link from "next/link";
import Stars from "../../shared/components/Stars";
import { useWishlist } from "../../shared/context/useWishlist";
import type { Product } from "../../shared/api/client";

type ProductGridProps = {
  products: Product[];
  title?: string;
};

const ProductGrid = ({ products, title }: ProductGridProps) => {
  const wishlist = useWishlist();
  return (
    <section className="mt-12 sm:mt-16">
      {title && (
        <h2 className="text-center text-2xl font-semibold tracking-tight text-gray-950 sm:text-3xl">{title}</h2>
      )}
      <div className="mt-8 grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 lg:grid-cols-4 sm:gap-6">
        {products.map((product) => (
          <Link key={product.id} href={`/product/${product.id}`} className="group min-w-0">
            <div className="relative aspect-4/5 overflow-hidden rounded-lg bg-gray-100">
              <img
                src={product.image}
                alt={product.name}
                loading="lazy"
                className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
              />
              <button
                type="button"
                onClick={(event) => {
                  event.preventDefault();
                  void wishlist.toggle(product.id);
                }}
                aria-label={wishlist.ids.includes(product.id) ? "Remove from wishlist" : "Add to wishlist"}
                className="absolute top-2 right-2 flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-rose-600 shadow-sm"
              >
                {wishlist.ids.includes(product.id) ? <FaHeart /> : <FaRegHeart />}
              </button>
              {product.stock === 0 && (
                <span className="absolute top-2 left-2 rounded bg-black px-2 py-1 text-xs text-white">Sold out</span>
              )}
            </div>
            <h3 className="mt-4 text-sm font-medium text-gray-950 sm:text-base">{product.name}</h3>
            <p className="mt-1 text-sm text-gray-600">{money(product.price)}</p>
            {product.rating && product.rating.count > 0 && (
              <div className="mt-1"><Stars value={product.rating.average} count={product.rating.count} size="h-3.5 w-3.5" /></div>
            )}
            {product.colors.length > 1 && (
              <div className="mt-2 flex gap-1.5" aria-label="Available colors">
                {product.colors.slice(0, 6).map((color) => (
                  <span
                    key={color.name}
                    title={product.variants.some((v) => v.color === color.name && v.stock > 0) ? color.name : `${color.name} (sold out)`}
                    className={`h-3.5 w-3.5 rounded-full border border-gray-300 ${product.variants.some((v) => v.color === color.name && v.stock > 0) ? "" : "opacity-30"}`}
                    style={{ backgroundColor: color.hex }}
                  />
                ))}
              </div>
            )}
          </Link>
        ))}
      </div>
    </section>
  );
};

export default ProductGrid;
