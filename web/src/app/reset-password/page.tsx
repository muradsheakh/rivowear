import type { Metadata } from "next";
import { Suspense } from "react";
import View from "@/views/ResetPassword";

export const metadata: Metadata = { title: "Reset password", robots: { index: false, follow: false } };

export default function Page() {
  return (
    <Suspense>
      <View />
    </Suspense>
  );
}
