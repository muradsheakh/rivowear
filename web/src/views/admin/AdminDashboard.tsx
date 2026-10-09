"use client";

import { useEffect, useState } from "react";
import { HiOutlineChartBar, HiOutlineClipboardList, HiOutlineCube, HiOutlineUsers } from "react-icons/hi";
import Link from "next/link";
import { api, type AdminSummary } from "../../shared/api/client";
import { useAuth } from "../../shared/context/useAuth";
import { money } from "../../shared/money";
import { statusStyle } from "../../shared/orderStatus";
import RecentOrdersTable from "../../admin/components/RecentOrdersTable";
import SalesChart from "../../admin/components/SalesChart";
import StatsGrid from "../../admin/components/StatsGrid";

const AdminDashboard = () => {
  const { token } = useAuth();
  const [summary, setSummary] = useState<AdminSummary | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token) return;
    const load = () => api.admin.summary(token).then(setSummary).catch((requestError: Error) => setError(requestError.message));
    void load();
    const timer = window.setInterval(() => void load(), 30_000); // new orders show up on their own
    return () => window.clearInterval(timer);
  }, [token]);

  if (error) return <p className="text-sm text-red-600" role="alert">{error}</p>;
  if (!summary) return <p className="text-sm text-gray-500">Loading dashboard...</p>;

  return (
    <>
      <StatsGrid
        stats={[
          { label: "Total revenue", value: money(summary.revenue), hint: "Excludes cancelled and returned", icon: HiOutlineChartBar },
          { label: "Orders", value: String(summary.orders), hint: `${summary.todayOrders} today · ${summary.pendingOrders} pending`, icon: HiOutlineClipboardList },
          { label: "Products", value: String(summary.products), icon: HiOutlineCube },
          { label: "Customers", value: String(summary.customers), hint: "Including guest buyers", icon: HiOutlineUsers },
        ]}
      />

      {(summary.paymentsToVerify > 0 || summary.pendingOrders > 0) && (
        <section className="mt-6 rounded-xl border border-blue-200 bg-blue-50 p-5 text-sm text-blue-900">
          {summary.pendingOrders > 0 && <p><b>{summary.pendingOrders}</b> new order(s) waiting. <Link href="/admin/orders?status=Pending" className="underline">Review now</Link></p>}
          {summary.paymentsToVerify > 0 && <p className="mt-1"><b>{summary.paymentsToVerify}</b> bKash/Nagad payment(s) to verify. <Link href="/admin/orders?payment=pending_verification" className="underline">Verify now</Link></p>}
        </section>
      )}

      <div className="mt-6 grid gap-6 xl:grid-cols-[2fr_1fr]">
        <section className="rounded-xl border border-gray-200 bg-white p-5">
          <h2 className="font-semibold">Revenue, last 14 days</h2>
          <div className="mt-4"><SalesChart days={summary.salesByDay} /></div>
        </section>
        <section className="rounded-xl border border-gray-200 bg-white p-5">
          <h2 className="font-semibold">Orders by status</h2>
          <ul className="mt-4 space-y-2 text-sm">
            {summary.statusCounts.map((row) => (
              <li key={row.status} className="flex items-center justify-between">
                <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${statusStyle[row.status]}`}>{row.status}</span>
                <span className="font-medium">{row.count}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <section className="rounded-xl border border-gray-200 bg-white p-5">
          <h2 className="font-semibold">Top selling products</h2>
          {summary.topProducts.length === 0 && <p className="mt-3 text-sm text-gray-500">No sales yet.</p>}
          <ul className="mt-3 divide-y text-sm">
            {summary.topProducts.map((item) => (
              <li key={item.id} className="flex justify-between py-2"><span>{item.name}</span><span className="text-gray-600">{item.quantity} sold · {money(item.revenue)}</span></li>
            ))}
          </ul>
        </section>
        <section className="rounded-xl border border-amber-200 bg-amber-50 p-5">
          <h2 className="font-semibold text-amber-900">Low stock</h2>
          {summary.lowStock.length === 0 && <p className="mt-3 text-sm text-amber-900">Every color and size is well stocked.</p>}
          <ul className="mt-3 space-y-1 text-sm text-amber-900">
            {summary.lowStock.map((item) => <li key={`${item.id}-${item.variant}`}>{item.name} ({item.variant}): {item.stock === 0 ? "sold out" : `${item.stock} left`}</li>)}
          </ul>
        </section>
      </div>

      <RecentOrdersTable orders={summary.recentOrders} />
    </>
  );
};

export default AdminDashboard;
