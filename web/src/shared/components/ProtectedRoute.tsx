"use client";

import { useEffect, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "../context/useAuth";
import { useHydrated } from "../useHydrated";

type ProtectedRouteProps = { adminOnly?: boolean; customerOnly?: boolean; children: ReactNode };

/** Restricts pages by role and sends logged-out visitors to login, then back to the requested page. */
const ProtectedRoute = ({ adminOnly = false, customerOnly = false, children }: ProtectedRouteProps) => {
  const { token, user } = useAuth();
  const hydrated = useHydrated();
  const router = useRouter();
  const pathname = usePathname();
  const blocked =
    hydrated &&
    (!token ||
      (adminOnly && user !== null && user.role !== "admin") ||
      (customerOnly && user !== null && user.role !== "customer"));

  useEffect(() => {
    if (!hydrated) return;
    if (!token) router.replace(`/login?from=${encodeURIComponent(pathname + window.location.search)}`);
    else if (adminOnly && user && user.role !== "admin") router.replace("/");
    else if (customerOnly && user && user.role !== "customer") router.replace("/admin");
  }, [hydrated, token, user, adminOnly, customerOnly, pathname, router]);

  if (!hydrated || blocked || !token || ((adminOnly || customerOnly) && !user)) {
    return <p className="py-24 text-center text-sm text-gray-500">Loading...</p>;
  }
  return <>{children}</>;
};

export default ProtectedRoute;
