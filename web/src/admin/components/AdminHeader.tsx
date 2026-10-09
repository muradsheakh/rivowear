"use client";


import Link from "next/link";
import { usePathname } from "next/navigation";
import { HiOutlineLogout } from "react-icons/hi";
import { useAuth } from "../../shared/context/useAuth";
import { adminMenu } from "../menu";

type AdminHeaderProps = { title: string; onLogout: () => void };

const AdminHeader = ({ title, onLogout }: AdminHeaderProps) => {
  const { user } = useAuth();
  const pathname = usePathname();
  const initials = (user?.name ?? "A")
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <header className="border-b border-gray-200 bg-white px-5 py-4 sm:px-8">
      <div className="flex min-h-12 items-center justify-between">
        <div>
          <p className="text-sm text-gray-500">
            {new Date().toLocaleDateString(undefined, { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">{title}</h1>
        </div>
        <div className="flex items-center gap-3">
          <div className="hidden text-right sm:block">
            <p className="text-sm font-semibold">{user?.name}</p>
            <p className="text-xs text-gray-500">Administrator</p>
          </div>
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-black text-sm font-semibold text-white">
            {initials}
          </div>
          <button
            type="button"
            onClick={onLogout}
            aria-label="Log out"
            className="ml-1 rounded-md p-2 text-gray-500 hover:bg-gray-100 hover:text-black lg:hidden"
          >
            <HiOutlineLogout className="h-5 w-5" />
          </button>
        </div>
      </div>
      <nav className="mt-3 flex gap-2 overflow-x-auto lg:hidden">
        {adminMenu.map(({ label, to, end }) => (
          <Link
            key={label}
            href={to}
            className={`rounded-full px-4 py-1.5 text-sm whitespace-nowrap ${(end ? pathname === to : pathname.startsWith(to)) ? "bg-black text-white" : "bg-gray-100 text-gray-700"}`}
          >
            {label}
          </Link>
        ))}
      </nav>
    </header>
  );
};

export default AdminHeader;
