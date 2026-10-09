import type { Metadata } from "next";
import { Suspense } from "react";
import View from "@/views/Register";

export const metadata: Metadata = { title: "Create account", robots: { index: false, follow: false } };

export default function Page() {
  return (
    <Suspense>
      <View />
    </Suspense>
  );
}
