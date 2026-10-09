import type { Product, Review, ReviewSummary, Settings } from "./client";

const API_URL = process.env.API_INTERNAL_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api";

export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");

/** Reads from the API while a page is built on the server. Pages are cached briefly, so repeat visits are instant. */
export const serverGet = async <T>(path: string, revalidate = 60): Promise<T | null> => {
  try {
    const response = await fetch(`${API_URL}${path}`, { next: { revalidate } });
    if (!response.ok) return null;
    return (await response.json()) as T;
  } catch {
    return null;
  }
};

export const getSettingsServer = async (): Promise<Settings | null> => (await serverGet<{ settings: Settings }>("/settings", 30))?.settings ?? null;

export const getProductsServer = async (query: Record<string, string | number | boolean | undefined> = {}): Promise<Product[]> => {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) if (value !== undefined && value !== "" && value !== false) params.set(key, String(value));
  const qs = params.toString();
  return (await serverGet<{ products: Product[] }>(`/products${qs ? `?${qs}` : ""}`))?.products ?? [];
};

export const getProductServer = async (id: string): Promise<Product | null> =>
  (await serverGet<{ product: Product }>(`/products/${encodeURIComponent(id)}`))?.product ?? null;

export const getSimilarServer = async (id: string): Promise<Product[]> =>
  (await serverGet<{ products: Product[] }>(`/products/${encodeURIComponent(id)}/similar`))?.products ?? [];

export const getReviewsServer = async (id: string) =>
  serverGet<{ reviews: Review[]; summary: ReviewSummary }>(`/products/${encodeURIComponent(id)}/reviews`);

export const getColorsServer = async () =>
  (await serverGet<{ colors: { name: string; hex: string }[] }>("/colors"))?.colors ?? [];
