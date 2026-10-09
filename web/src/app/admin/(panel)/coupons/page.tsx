import type { Metadata } from "next";
import { Suspense } from "react";
import View from "@/views/admin/AdminCoupons";

export const metadata: Metadata = { title: "Coupons" };

export default function Page() {
  return (
    <Suspense>
      <View />
    </Suspense>
  );
}
