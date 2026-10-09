import type { MetadataRoute } from "next";
import { SITE_URL } from "@/shared/api/server";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/admin", "/checkout", "/orders", "/wishlist", "/invoice", "/track", "/order-success", "/login", "/register", "/reset-password", "/forgot-password"] }],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
