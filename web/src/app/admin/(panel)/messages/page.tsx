import type { Metadata } from "next";
import { Suspense } from "react";
import View from "@/views/admin/AdminMessages";

export const metadata: Metadata = { title: "Failed messages" };

export default function Page() {
  return (
    <Suspense>
      <View />
    </Suspense>
  );
}
