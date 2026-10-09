import type { Metadata } from "next";
import View from "@/views/account/MyReviews";

export const metadata: Metadata = { title: "My reviews" };

export default function Page() {
  return <View />;
}
