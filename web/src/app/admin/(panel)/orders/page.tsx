import type { Metadata } from "next";
import { Suspense } from "react";
import View from "@/views/admin/AdminOrders";

export const metadata: Metadata = { title: "Orders" };

export default function Page() {
  return (
    <Suspense>
      <View />
    </Suspense>
  );
}
