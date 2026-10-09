"use client";

import { useEffect, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "../context/useAuth";
import { useHydrated } from "../useHydrated";

type ProtectedRouteProps = { adminOnly?: boolean; children: ReactNode };

/** Wrap pages that need a login. Logged-out visitors are sent to /login and brought back afterwards. */
const ProtectedRoute = ({ adminOnly = false, children }: ProtectedRouteProps) => {
  const { token, user } = useAuth();
  const hydrated = useHydrated();
  const router = useRouter();
  const pathname = usePathname();
  const blocked = hydrated && (!token || (adminOnly && user !== null && user.role !== "admin"));

  useEffect(() => {
    if (!hydrated) return;
    if (!token) router.replace(`/login?from=${encodeURIComponent(pathname + window.location.search)}`);
    else if (adminOnly && user && user.role !== "admin") router.replace("/");
  }, [hydrated, token, user, adminOnly, pathname, router]);

  if (!hydrated || blocked || !token || (adminOnly && !user)) {
    return <p className="py-24 text-center text-sm text-gray-500">Loading...</p>;
  }
  return <>{children}</>;
};

export default ProtectedRoute;
