"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import ProductGrid from "../components/Products/ProductGrid";
import { api, type Product } from "../shared/api/client";
import { useAuth } from "../shared/context/useAuth";
import { useWishlist } from "../shared/context/useWishlist";

const Wishlist = () => {
  const { token } = useAuth();
  const { ids } = useWishlist();
  const [products, setProducts] = useState<Product[] | null>(null);

  useEffect(() => {
    if (!token) return;
    api.wishlist(token).then((response) => setProducts(response.products)).catch(() => setProducts([]));
  }, [token]);

  const visible = products?.filter((product) => ids.includes(product.id)) ?? [];

  return (
    <>
            <div>
        <h1 className="text-3xl font-semibold tracking-tight">My wishlist</h1>
        {!products && <p className="mt-8 text-sm text-gray-500">Loading...</p>}
        {products && visible.length === 0 && (
          <div className="py-16 text-center">
            <p className="text-gray-500">Tap the heart on any product to save it here.</p>
            <Link href="/shop" className="mt-6 inline-flex rounded-md bg-black px-6 py-3 text-sm text-white">Browse products</Link>
          </div>
        )}
        {visible.length > 0 && <ProductGrid products={visible} />}
      </div>
          </>
  );
};

export default Wishlist;
