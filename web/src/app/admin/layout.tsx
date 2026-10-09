import type { Metadata } from "next";
import type { ReactNode } from "react";
import ProtectedRoute from "@/shared/components/ProtectedRoute";

export const metadata: Metadata = { title: { default: "Admin", template: "%s | Rivowear Admin" }, robots: { index: false, follow: false } };

export default function AdminGuard({ children }: { children: ReactNode }) {
  return <ProtectedRoute adminOnly>{children}</ProtectedRoute>;
}
