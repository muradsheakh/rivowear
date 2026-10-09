import type { ReactNode } from "react";
import AdminLayout from "@/admin/components/AdminLayout";

export default function PanelLayout({ children }: { children: ReactNode }) {
  return <AdminLayout>{children}</AdminLayout>;
}
