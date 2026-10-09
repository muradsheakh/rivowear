import type { Metadata } from "next";
import type { ReactNode } from "react";
import AccountShell from "@/components/Account/AccountShell";
import ProtectedRoute from "@/shared/components/ProtectedRoute";

export const metadata: Metadata = { robots: { index: false, follow: false } };

export default function AccountLayout({ children }: { children: ReactNode }) {
  return (
    <ProtectedRoute>
      <AccountShell>{children}</AccountShell>
    </ProtectedRoute>
  );
}
