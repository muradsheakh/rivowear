import type { Metadata } from "next";
import { Suspense } from "react";
import View from "@/views/admin/AdminReviews";

export const metadata: Metadata = { title: "Reviews" };

export default function Page() {
  return (
    <Suspense>
      <View />
    </Suspense>
  );
}
