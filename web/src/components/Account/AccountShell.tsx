"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { HiOutlineClipboardList, HiOutlineHeart, HiOutlineLocationMarker, HiOutlineLockClosed, HiOutlineStar, HiOutlineUser } from "react-icons/hi";
import Footer from "../Common/Footer";
import Header from "../Common/Header";
import { useAuth } from "../../shared/context/useAuth";

const LINKS = [
  { href: "/account", label: "My profile", icon: HiOutlineUser, exact: true },
  { href: "/orders", label: "My orders", icon: HiOutlineClipboardList, exact: false },
  { href: "/account/addresses", label: "Addresses", icon: HiOutlineLocationMarker, exact: false },
  { href: "/wishlist", label: "Wishlist", icon: HiOutlineHeart, exact: false },
  { href: "/account/reviews", label: "My reviews", icon: HiOutlineStar, exact: false },
  { href: "/account/security", label: "Password & security", icon: HiOutlineLockClosed, exact: false },
];

/** Page frame for everything a logged-in customer manages: sidebar on desktop, scrolling tabs on phones. */
const AccountShell = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const pathname = usePathname();
  const initials = (user?.name ?? "?").split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase();

  return (
    <>
      <Header />
      <div className="mx-auto max-w-6xl px-5 py-10 sm:px-8">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-black text-lg font-semibold text-white">{initials}</div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">{user?.name}</h1>
            <p className="text-sm text-gray-500">{user?.email ?? user?.phone ?? user?.contact}</p>
          </div>
        </div>
        <div className="mt-8 grid gap-8 lg:grid-cols-[230px_1fr]">
          <nav aria-label="Account" className="flex gap-2 overflow-x-auto lg:flex-col lg:gap-1">
            {LINKS.map(({ href, label, icon: Icon, exact }) => {
              const active = exact ? pathname === href : pathname.startsWith(href);
              return (
                <Link
                  key={href}
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className={`flex items-center gap-3 rounded-lg px-4 py-2.5 text-sm font-medium whitespace-nowrap ${active ? "bg-black text-white" : "bg-gray-50 text-gray-700 hover:bg-gray-100 lg:bg-transparent"}`}
                >
                  <Icon className="h-5 w-5" />
                  {label}
                </Link>
              );
            })}
          </nav>
          <div className="min-w-0">{children}</div>
        </div>
      </div>
      <Footer />
    </>
  );
};

export default AccountShell;
