import type { Metadata } from "next";
import { Suspense } from "react";
import View from "@/views/admin/AdminCustomers";

export const metadata: Metadata = { title: "Customers" };

export default function Page() {
  return (
    <Suspense>
      <View />
    </Suspense>
  );
}
