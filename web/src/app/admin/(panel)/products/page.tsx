import type { Metadata } from "next";
import { Suspense } from "react";
import View from "@/views/admin/AdminProducts";

export const metadata: Metadata = { title: "Products" };

export default function Page() {
  return (
    <Suspense>
      <View />
    </Suspense>
  );
}
