import type { Metadata } from "next";
import View from "@/views/account/Addresses";

export const metadata: Metadata = { title: "My addresses" };

export default function Page() {
  return <View />;
}
