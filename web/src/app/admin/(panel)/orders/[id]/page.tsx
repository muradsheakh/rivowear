import type { Metadata } from "next";
import { Suspense } from "react";
import View from "@/views/admin/AdminOrderDetail";

export const metadata: Metadata = { title: "Order" };

export default function Page() {
  return (
    <Suspense>
      <View />
    </Suspense>
  );
}
