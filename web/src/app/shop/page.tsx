import type { Metadata } from "next";
import { Suspense } from "react";
import Footer from "@/components/Common/Footer";
import Header from "@/components/Common/Header";
import ProductGrid from "@/components/Products/ProductGrid";
import ShopFilters from "@/components/Shop/ShopFilters";
import { getProductsServer, getSettingsServer } from "@/shared/api/server";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const pick = (value: string | string[] | undefined) => (typeof value === "string" ? value : "");

export async function generateMetadata({ searchParams }: { searchParams: SearchParams }): Promise<Metadata> {
  const sp = await searchParams;
  const settings = await getSettingsServer();
  const gender = pick(sp.gender);
  const category = settings?.categories.find((item) => item.slug === pick(sp.category))?.label;
  const title = [gender === "men" ? "Men's" : gender === "women" ? "Women's" : "", category ?? "Clothing"].filter(Boolean).join(" ");
  const filtered = Object.keys(sp).some((key) => key !== "gender" && key !== "category");
  return {
    title,
    description: `Browse ${title.toLowerCase()} at Rivowear. Cash on delivery and fast delivery across Bangladesh.`,
    // Search and sort pages are not worth indexing; plain category and gender pages are.
    alternates: { canonical: "/shop" },
    robots: filtered ? { index: false, follow: true } : undefined,
  };
}

export default async function ShopPage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const [products, settings] = await Promise.all([
    getProductsServer({
      category: pick(sp.category), gender: pick(sp.gender), sort: pick(sp.sort),
      minPrice: pick(sp.minPrice), maxPrice: pick(sp.maxPrice), inStock: pick(sp.inStock) === "true",
    }),
    getSettingsServer(),
  ]);

  return (
    <>
      <Header />
      <main className="mx-auto max-w-7xl px-5 py-10 sm:px-8">
        <h1 className="text-3xl font-semibold tracking-tight">Shop all</h1>
        <Suspense>
          <ShopFilters categories={settings?.categories.map((item) => ({ label: item.label, value: item.slug })) ?? []} />
        </Suspense>
        {products.length === 0 ? (
          <p className="py-16 text-center text-sm text-gray-500">No products match your filters.</p>
        ) : (
          <ProductGrid products={products} />
        )}
      </main>
      <Footer />
    </>
  );
}
