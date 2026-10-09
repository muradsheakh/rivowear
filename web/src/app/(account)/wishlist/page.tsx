import type { Metadata } from "next";
import { Suspense } from "react";
import View from "@/views/Wishlist";

export const metadata: Metadata = { title: "My wishlist", robots: { index: false, follow: false } };

export default function Page() {
  return (
    <Suspense>
      <View />
    </Suspense>
  );
}
