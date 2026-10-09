"use client";

import { HiOutlineUser, HiOutlineShoppingBag } from "react-icons/hi";

import Link from "next/link";
import CartDrawer from "../Layout/CartDrawer";
import { useEffect, useState } from "react";
import { useAuth } from "../../shared/context/useAuth";
import { useCart } from "../../context/useCart";
const NAV_LINKS = [
  { label: "Men", to: "/shop?gender=men" },
  { label: "Women", to: "/shop?gender=women" },
  { label: "Top Wear", to: "/shop?category=top-wear" },
  { label: "Bottom Wear", to: "/shop?category=bottom-wear" },
  { label: "Track Order", to: "/track" },
];

const Navbar = () => {
  const { itemCount } = useCart();
  const { user, logout } = useAuth();
  const [accountOpen, setAccountOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [navbarOpen, setNavbarOpen] = useState(false);

  const toggleNavbar = () => {
    setNavbarOpen(!navbarOpen);
  };

  const handleMenuItemClick = () => {
    setNavbarOpen(false);
  };

  useEffect(() => {
    if (!navbarOpen) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setNavbarOpen(false);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [navbarOpen]);

  return (
    <>
      <nav className="container mx-auto flex w-full min-w-0 items-center justify-between px-6 py-4">
        {/* left logo */}
        <div>
          <Link href="/" className="text-2xl font-medium">
            Rivowear
          </Link>
        </div>

        <div>
          {/* center navigation links */}
          <div className="hidden space-x-6 md:flex">
            {NAV_LINKS.map((item) => (
              <Link
                key={item.label}
                href={item.to}
                className="text-sm font-medium text-gray-700 uppercase hover:text-black"
              >
                {item.label}
              </Link>
            ))}
          </div>
        </div>

        {/* Right Icons  */}
        <div className="flex min-w-0 items-center space-x-4">
          {user ? (
            <div className="relative">
              <button
                type="button"
                onClick={() => setAccountOpen((open) => !open)}
                className="hover:text-black"
                aria-label="Account menu"
                aria-expanded={accountOpen}
              >
                <HiOutlineUser className="h-6 w-6 text-gray-700" />
              </button>
              {accountOpen && (
                <div className="absolute right-0 z-50 mt-3 w-48 rounded-lg border border-gray-200 bg-white py-2 text-sm shadow-lg">
                  <p className="truncate px-4 pb-2 text-xs text-gray-500">{user.name}</p>
                  {user.role === "admin" && (
                    <Link href="/admin" onClick={() => setAccountOpen(false)} className="block px-4 py-2 hover:bg-gray-100">Admin dashboard</Link>
                  )}
                  {user.role === "customer" && (
                    <>
                      <Link href="/account" onClick={() => setAccountOpen(false)} className="block px-4 py-2 hover:bg-gray-100">My profile</Link>
                      <Link href="/orders" onClick={() => setAccountOpen(false)} className="block px-4 py-2 hover:bg-gray-100">My orders</Link>
                      <Link href="/wishlist" onClick={() => setAccountOpen(false)} className="block px-4 py-2 hover:bg-gray-100">Wishlist</Link>
                    </>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setAccountOpen(false);
                      void logout();
                    }}
                    className="block w-full px-4 py-2 text-left hover:bg-gray-100"
                  >
                    Log out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <Link href="/login" className="hover:text-black" aria-label="Log in">
              <HiOutlineUser className="h-6 w-6 text-gray-700" />
            </Link>
          )}

          {user?.role !== "admin" && (
            <button
              onClick={() => setDrawerOpen(true)}
              className="relative hover:text-black"
              aria-label="Open cart"
            >
              <HiOutlineShoppingBag className="h-6 w-6 text-gray-700" />
              {itemCount > 0 && (
                <span className="bg-rabbit-red absolute -top-1 rounded-full px-2 py-0.5 text-xs text-white">
                  {itemCount}
                </span>
              )}
            </button>
          )}
          {/* search bar  */}

          <button
            onClick={toggleNavbar}
            className="relative flex h-6 w-6 items-center justify-center md:hidden"
            aria-label={navbarOpen ? "Close menu" : "Open menu"}
            aria-expanded={navbarOpen}
          >
            <span
              className={`absolute h-0.5 w-6 bg-gray-700 transition-transform duration-300 ${
                navbarOpen ? "rotate-45" : "-translate-y-2"
              }`}
            />
            <span
              className={`absolute h-0.5 w-6 bg-gray-700 transition-all duration-300 ${
                navbarOpen ? "scale-0 opacity-0" : "scale-100 opacity-100"
              }`}
            />
            <span
              className={`absolute h-0.5 w-6 bg-gray-700 transition-transform duration-300 ${
                navbarOpen ? "-rotate-45" : "translate-y-2"
              }`}
            />
          </button>
        </div>
      </nav>
      <CartDrawer
        drawerOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
      />
      <>
        <button
          type="button"
          className={`fixed inset-0 z-40 bg-black/20 transition-opacity duration-300 md:hidden ${
            navbarOpen
              ? "visible opacity-100"
              : "pointer-events-none invisible opacity-0"
          }`}
          onClick={() => setNavbarOpen(false)}
          aria-label="Close menu"
        />
        <aside
          className={`fixed top-0 left-0 z-50 h-full w-3/4 bg-white p-4 shadow-lg transition-transform duration-300 ease-out md:hidden ${
            navbarOpen ? "translate-x-0" : "-translate-x-full"
          }`}
          aria-hidden={!navbarOpen}
        >
          <h2 className="mt-2 text-lg font-semibold">Menu</h2>
          <nav className="mt-4 space-y-1">
             {NAV_LINKS.map((item) => (
              <Link
                key={item.label}
                href={item.to}
                onClick={handleMenuItemClick}
                tabIndex={navbarOpen ? 0 : -1}
                className="group flex touch-manipulation items-center rounded-lg px-3 py-2.5 text-sm text-gray-700 transition-all duration-200 hover:bg-gray-100 hover:pl-4 hover:text-black focus-visible:bg-gray-100 focus-visible:text-black focus-visible:outline-none active:scale-[0.98] active:bg-gray-100 active:text-black"
              >
                <span className="group-hover:bg-rabbit-red group-active:bg-rabbit-red group-focus-visible:bg-rabbit-red mr-2 h-1.5 w-1.5 rounded-full bg-transparent transition-colors duration-200" />
                <span>{item.label}</span>
              </Link>
            ))}
          </nav>
        </aside>
      </>
    </>
  );
};

export default Navbar;
