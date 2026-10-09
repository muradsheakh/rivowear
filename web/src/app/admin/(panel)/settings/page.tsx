import type { Metadata } from "next";
import { Suspense } from "react";
import View from "@/views/admin/AdminSettings";

export const metadata: Metadata = { title: "Settings" };

export default function Page() {
  return (
    <Suspense>
      <View />
    </Suspense>
  );
}
