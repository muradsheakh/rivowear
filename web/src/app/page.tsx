import type { Metadata } from "next";
import Footer from "@/components/Common/Footer";
import Header from "@/components/Common/Header";
import Hero from "@/components/Layout/Hero";
import FeatureSection from "@/components/Products/FeatureSection";
import FeaturesCollection from "@/components/Products/FeaturesCollection";
import GenderCollection from "@/components/Products/GenderCollection";
import NewArrivals from "@/components/Products/NewArrivals";
import ProductDetails from "@/components/Products/ProductDetails";
import ProductGrid from "@/components/Products/ProductGrid";
import { getProductsServer } from "@/shared/api/server";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: { absolute: "Rivowear | Modern clothing for men and women in Bangladesh" },
  alternates: { canonical: "/" },
};

export default async function HomePage() {
  const [newArrivals, bestSellers, womenTops] = await Promise.all([
    getProductsServer({ isNew: true, limit: 8 }),
    getProductsServer({ bestSeller: true, limit: 4 }),
    getProductsServer({ gender: "women", category: "top-wear", limit: 8 }),
  ]);
  const featured = bestSellers[0];

  return (
    <>
      <Header />
      <Hero />
      <GenderCollection />
      {newArrivals.length > 0 && <NewArrivals products={newArrivals} />}
      {featured && (
        <>
          <h2 className="mb-4 text-center text-3xl font-bold">Best Sellers</h2>
          <ProductDetails key={featured.id} product={featured} />
        </>
      )}
      {womenTops.length > 0 && (
        <div className="container mx-auto px-6">
          <ProductGrid products={womenTops} title="Top Wears for Women" />
        </div>
      )}
      <FeaturesCollection />
      <FeatureSection />
      <Footer />
    </>
  );
}
