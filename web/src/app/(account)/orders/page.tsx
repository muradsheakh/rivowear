import type { Metadata } from "next";
import { Suspense } from "react";
import View from "@/views/Orders";

export const metadata: Metadata = { title: "My orders", robots: { index: false, follow: false } };

export default function Page() {
  return (
    <Suspense>
      <View />
    </Suspense>
  );
}
