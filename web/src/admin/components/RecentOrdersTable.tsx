"use client";

import { money } from "../../shared/money";
import Link from "next/link";
import type { Order } from "../../shared/api/client";
import { statusStyle } from "../../shared/orderStatus";

const RecentOrdersTable = ({ orders }: { orders: Order[] }) => (
  <section className="mt-8 rounded-xl border border-gray-200 bg-white">
    <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4 sm:px-6">
      <div>
        <h2 className="font-semibold">Recent orders</h2>
        <p className="mt-1 text-sm text-gray-500">Overview of your latest customer orders</p>
      </div>
      <Link href="/admin/orders" className="text-sm font-medium underline underline-offset-4">View all</Link>
    </div>
    <div className="overflow-x-auto">
      <table className="w-full min-w-162.5 text-left text-sm">
        <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
          <tr>
            {["Order", "Customer", "Date", "Total", "Status"].map((heading) => (
              <th key={heading} className="px-5 py-3 font-medium sm:px-6">{heading}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {orders.length === 0 && (
            <tr><td colSpan={5} className="px-6 py-8 text-center text-gray-500">No orders yet.</td></tr>
          )}
          {orders.map((order) => (
            <tr key={order.id} className="hover:bg-gray-50">
              <td className="px-5 py-4 font-medium sm:px-6"><Link href={`/admin/orders/${order.id}`} className="underline underline-offset-4">{order.id}</Link></td>
              <td className="px-5 py-4 sm:px-6">{order.customer}</td>
              <td className="px-5 py-4 text-gray-500 sm:px-6">{new Date(order.createdAt).toLocaleDateString()}</td>
              <td className="px-5 py-4 font-medium sm:px-6">{money(order.total)}</td>
              <td className="px-5 py-4 sm:px-6">
                <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${statusStyle[order.status]}`}>{order.status}</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </section>
);

export default RecentOrdersTable;
