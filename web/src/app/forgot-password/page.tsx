import type { Metadata } from "next";
import { Suspense } from "react";
import View from "@/views/ForgotPassword";

export const metadata: Metadata = { title: "Forgot password", robots: { index: false, follow: false } };

export default function Page() {
  return (
    <Suspense>
      <View />
    </Suspense>
  );
}
