import type { MetadataRoute } from "next";
import { SITE_URL, serverGet } from "@/shared/api/server";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const data = await serverGet<{ products: { id: string; createdAt: string }[] }>("/sitemap-data", 3600);
  return [
    { url: SITE_URL, changeFrequency: "daily", priority: 1 },
    { url: `${SITE_URL}/shop`, changeFrequency: "daily", priority: 0.9 },
    ...(data?.products ?? []).map((product) => ({ url: `${SITE_URL}/product/${product.id}`, lastModified: product.createdAt, changeFrequency: "weekly" as const, priority: 0.8 })),
  ];
}
