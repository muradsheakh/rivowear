import type { Metadata } from "next";
import { Suspense } from "react";
import View from "@/views/Track";

export const metadata: Metadata = { title: "Track your order", robots: { index: false, follow: false } };

export default function Page() {
  return (
    <Suspense>
      <View />
    </Suspense>
  );
}
