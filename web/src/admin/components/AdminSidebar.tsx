"use client";


import Link from "next/link";
import { usePathname } from "next/navigation";
import { HiOutlineLogout } from "react-icons/hi";
import { adminMenu } from "../menu";

type AdminSidebarProps = { onLogout: () => void; onHome: () => void };

const AdminSidebar = ({ onLogout, onHome }: AdminSidebarProps) => {
  const pathname = usePathname();
  return (
  <aside className="fixed inset-y-0 left-0 hidden w-64 border-r border-gray-200 bg-white lg:block">
    <div className="flex h-20 items-center border-b border-gray-100 px-7">
      <button type="button" onClick={onHome} className="text-2xl font-semibold tracking-tight">
        Rivowear
      </button>
    </div>
    <div className="px-4 py-6">
      <p className="px-3 text-xs font-semibold tracking-widest text-gray-400 uppercase">Main menu</p>
      <nav className="mt-4 space-y-1">
        {adminMenu.map(({ label, to, icon: Icon, end }) => (
          <Link
            key={label}
            href={to}
            className={`flex w-full items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium ${
              (end ? pathname === to : pathname.startsWith(to)) ? "bg-black text-white" : "text-gray-600 hover:bg-gray-100"
            }`}
          >
            <Icon className="h-5 w-5" />
            {label}
          </Link>
        ))}
      </nav>
    </div>
    <button
      type="button"
      onClick={onLogout}
      className="absolute bottom-7 left-7 flex items-center gap-3 text-sm font-medium text-gray-600 hover:text-black"
    >
      <HiOutlineLogout className="h-5 w-5" />
      Log out
    </button>
  </aside>
  );
};

export default AdminSidebar;