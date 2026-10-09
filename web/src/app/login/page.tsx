import type { Metadata } from "next";
import { Suspense } from "react";
import View from "@/views/Login";

export const metadata: Metadata = { title: "Log in", robots: { index: false, follow: false } };

export default function Page() {
  return (
    <Suspense>
      <View />
    </Suspense>
  );
}
