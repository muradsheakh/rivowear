"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { useNavigate } from "@/shared/router";
import { useAuth } from "../../shared/context/useAuth";
import AdminHeader from "./AdminHeader";
import AdminSidebar from "./AdminSidebar";
import { adminMenu } from "../menu";

const AdminLayout = ({ children }: { children: ReactNode }) => {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const pathname = usePathname();
  const title = adminMenu.find((item) => (item.end ? pathname === item.to : pathname.startsWith(item.to)))?.label ?? "Admin";

  const handleLogout = () => {
    void logout().then(() => navigate("/login"));
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <AdminSidebar onHome={() => navigate("/")} onLogout={handleLogout} />
      <main className="lg:pl-64">
        <AdminHeader title={title} onLogout={handleLogout} />
        <div className="p-5 sm:p-8">
          {children}
        </div>
      </main>
    </div>
  );
};

export default AdminLayout;
