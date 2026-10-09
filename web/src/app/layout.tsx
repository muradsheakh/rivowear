import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { SITE_URL, getSettingsServer } from "@/shared/api/server";
import Providers from "./providers";
import "./globals.css";

const DESCRIPTION = "Shop modern men's and women's clothing in Bangladesh. Cash on delivery, bKash, Nagad and card payment, fast delivery across the country.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: "Rivowear | Modern clothing for men and women", template: "%s | Rivowear" },
  description: DESCRIPTION,
  openGraph: { type: "website", siteName: "Rivowear", locale: "en_BD", title: "Rivowear | Modern clothing for men and women", description: DESCRIPTION },
  twitter: { card: "summary_large_image" },
  icons: { icon: "/favicon.svg" },
};

export const viewport: Viewport = { width: "device-width", initialScale: 1 };

export default async function RootLayout({ children }: { children: ReactNode }) {
  const settings = await getSettingsServer();
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&display=swap"
        />
      </head>
      <body>
        <Providers settings={settings}>{children}</Providers>
      </body>
    </html>
  );
}
