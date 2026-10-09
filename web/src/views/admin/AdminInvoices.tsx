"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useSearchParams } from "@/shared/router";
import Invoice from "../../components/Invoice";
import { api, type Order, type Settings } from "../../shared/api/client";
import { useAuth } from "../../shared/context/useAuth";

/** Prints one or many invoices: /admin/invoices?ids=RW-1001,RW-1002 */
const AdminInvoices = () => {
  const { token } = useAuth();
  const [params] = useSearchParams();
  const ids = (params.get("ids") ?? "").split(",").filter(Boolean);
  const [data, setData] = useState<{ orders: Order[]; settings: Settings } | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token || ids.length === 0) return;
    Promise.all(ids.map((id) => api.admin.order(token, id)))
      .then((results) => setData({ orders: results.map((result) => result.order), settings: results[0]!.settings }))
      .catch((requestError: Error) => setError(requestError.message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, params]);

  return (
    <div className="min-h-screen bg-gray-100 py-8 print:bg-white print:py-0">
      <div className="mx-auto mb-4 flex max-w-3xl items-center justify-between px-4 print:hidden">
        <Link href="/admin/orders" className="text-sm underline">← Back to orders</Link>
        <button type="button" onClick={() => window.print()} className="rounded-md bg-black px-5 py-2 text-sm text-white">Print {ids.length > 1 ? `${ids.length} invoices` : "invoice"}</button>
      </div>
      {ids.length === 0 && <p className="text-center text-sm text-gray-500">No orders selected.</p>}
      {error && <p className="text-center text-sm text-red-600" role="alert">{error}</p>}
      {data && <div className="space-y-6 print:space-y-0">{data.orders.map((order) => <Invoice key={order.id} order={order} settings={data.settings} />)}</div>}
    </div>
  );
};

export default AdminInvoices;
