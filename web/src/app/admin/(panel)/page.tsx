import type { Metadata } from "next";
import { Suspense } from "react";
import View from "@/views/admin/AdminDashboard";

export const metadata: Metadata = { title: "Dashboard" };

export default function Page() {
  return (
    <Suspense>
      <View />
    </Suspense>
  );
}
