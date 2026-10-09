"use client";

import type { ReactNode } from "react";
import { CartProvider } from "@/context/CartProvider";
import type { Settings } from "@/shared/api/client";
import WhatsAppButton from "@/shared/components/WhatsAppButton";
import { AuthProvider } from "@/shared/context/AuthContext";
import { SettingsProvider } from "@/shared/context/SettingsProvider";
import { WishlistProvider } from "@/shared/context/WishlistProvider";

export default function Providers({ settings, children }: { settings: Settings | null; children: ReactNode }) {
  return (
    <AuthProvider>
      <SettingsProvider initial={settings}>
        <CartProvider>
          <WishlistProvider>
            {children}
            <WhatsAppButton />
          </WishlistProvider>
        </CartProvider>
      </SettingsProvider>
    </AuthProvider>
  );
}
