import type { Metadata } from "next";
import { Suspense } from "react";
import View from "@/views/InvoicePage";

export const metadata: Metadata = { title: "Invoice", robots: { index: false, follow: false } };

export default function Page() {
  return (
    <Suspense>
      <View />
    </Suspense>
  );
}
