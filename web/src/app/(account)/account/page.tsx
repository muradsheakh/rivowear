import type { Metadata } from "next";
import View from "@/views/account/Profile";

export const metadata: Metadata = { title: "My profile" };

export default function Page() {
  return <View />;
}
