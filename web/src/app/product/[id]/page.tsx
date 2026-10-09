import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Footer from "@/components/Common/Footer";
import Header from "@/components/Common/Header";
import ProductDetails from "@/components/Products/ProductDetails";
import ProductGrid from "@/components/Products/ProductGrid";
import { SITE_URL, getProductServer, getSimilarServer } from "@/shared/api/server";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const product = await getProductServer(id);
  if (!product) return { title: "Product not found", robots: { index: false } };
  const description = (product.description || `${product.name} from Rivowear.`).slice(0, 155);
  return {
    title: product.name,
    description,
    alternates: { canonical: `/product/${product.id}` },
    // These tags make a shared link on Facebook or WhatsApp show the photo, name and price.
    openGraph: { type: "website", title: product.name, description: `৳${product.price} · ${description}`, url: `/product/${product.id}`, images: [{ url: product.image, alt: product.name }] },
    twitter: { card: "summary_large_image", title: product.name, description, images: [product.image] },
  };
}

export default async function ProductPage({ params }: Props) {
  const { id } = await params;
  const [product, similar] = await Promise.all([getProductServer(id), getSimilarServer(id)]);
  if (!product) notFound();

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.description,
    sku: product.id,
    image: [...new Set(product.colors.flatMap((color) => color.images).concat(product.image))].slice(0, 6),
    brand: { "@type": "Brand", name: product.brand || "Rivowear" },
    offers: {
      "@type": "Offer",
      url: `${SITE_URL}/product/${product.id}`,
      priceCurrency: "BDT",
      price: product.price,
      availability: product.stock > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
    },
    ...(product.rating && product.rating.count > 0
      ? { aggregateRating: { "@type": "AggregateRating", ratingValue: product.rating.average, reviewCount: product.rating.count } }
      : {}),
  };

  return (
    <>
      <Header />
      <main className="min-h-[60vh]">
        {/* "<" is escaped so product text can never close the script tag. */}
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
        <ProductDetails key={product.id} product={product} showReviews />
        <div className="mx-auto max-w-6xl px-6 pb-16">
          <ProductGrid products={similar} title="You May Also Like" />
        </div>
      </main>
      <Footer />
    </>
  );
}
