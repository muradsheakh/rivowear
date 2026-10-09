"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "@/shared/router";
import { api, type CourierOption, type Order } from "../../shared/api/client";
import { useAuth } from "../../shared/context/useAuth";
import { money } from "../../shared/money";
import { methodLabel, paymentLabel, statusStyle } from "../../shared/orderStatus";

const STATUSES = ["Pending", "Processing", "Shipped", "Delivered", "Cancelled", "Returned"];

const AdminOrders = () => {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [search, setSearch] = useState(params.get("q") ?? "");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [couriers, setCouriers] = useState<CourierOption[]>([]);
  const [bulkProvider, setBulkProvider] = useState("");

  const status = params.get("status") ?? "";
  const payment = params.get("payment") ?? "";
  const q = params.get("q") ?? "";

  const load = useCallback(() => {
    if (!token) return;
    api.admin
      .orders(token, { q, status, payment })
      .then((response) => setOrders(response.orders))
      .catch((requestError: Error) => setError(requestError.message));
  }, [token, q, status, payment]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!token) return;
    api.admin.couriers(token).then((response) => { setCouriers(response.couriers); setBulkProvider(response.default); }).catch(() => undefined);
  }, [token]);

  const setParam = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    setSelected([]);
    setParams(next, { replace: true });
  };

  const toggle = (id: string) => setSelected((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]));

  const bulkOptions = couriers.filter((item) => !item.manual);

  const bulkCourier = () => {
    if (!token || selected.length === 0) return;
    setBusy(true);
    setMessage("");
    api.admin
      .bulkCourier(token, selected, bulkProvider || undefined)
      .then(({ results }) => {
        const ok = results.filter((result) => result.ok).length;
        const failed = results.filter((result) => !result.ok).map((result) => `${result.id}: ${result.message}`);
        setMessage(`Sent ${ok} of ${results.length} to the courier.${failed.length ? ` Problems — ${failed.join(" | ")}` : ""}`);
        setSelected([]);
        load();
      })
      .catch((requestError: Error) => setError(requestError.message))
      .finally(() => setBusy(false));
  };

  const sync = () => {
    if (!token) return;
    setBusy(true);
    api.admin
      .syncCourier(token)
      .then(({ updated }) => {
        setMessage(`Courier status refreshed (${updated} order(s) changed).`);
        load();
      })
      .catch((requestError: Error) => setError(requestError.message))
      .finally(() => setBusy(false));
  };

  const exportCsv = () => {
    if (!token) return;
    api.admin
      .exportCsv(token)
      .then((blob) => {
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `orders-${new Date().toISOString().slice(0, 10)}.csv`;
        link.click();
        URL.revokeObjectURL(url);
      })
      .catch((requestError: Error) => setError(requestError.message));
  };

  const control = "h-10 rounded-md border border-gray-200 bg-white px-3 text-sm outline-none focus:border-black";

  return (
    <>
      <div className="flex flex-wrap items-center gap-3">
        <form onSubmit={(event) => { event.preventDefault(); setParam("q", search.trim()); }} className="flex gap-2">
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search invoice, tracking, name, phone" className={`${control} w-72`} aria-label="Search orders" />
          <button type="submit" className="rounded-md bg-black px-4 text-sm text-white">Search</button>
        </form>
        <select value={status} onChange={(event) => setParam("status", event.target.value)} className={control} aria-label="Filter by status">
          <option value="">All statuses</option>
          {STATUSES.map((item) => <option key={item}>{item}</option>)}
        </select>
        <select value={payment} onChange={(event) => setParam("payment", event.target.value)} className={control} aria-label="Filter by payment">
          <option value="">All payments</option>
          {Object.entries(paymentLabel).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
        <div className="ml-auto flex gap-2">
          <button type="button" onClick={sync} disabled={busy} className={`${control} hover:bg-gray-50`}>Refresh courier status</button>
          <button type="button" onClick={exportCsv} className={`${control} hover:bg-gray-50`}>Export CSV</button>
        </div>
      </div>

      {selected.length > 0 && (
        <div className="mt-4 flex flex-wrap items-center gap-3 rounded-lg bg-gray-900 px-4 py-3 text-sm text-white">
          <span>{selected.length} selected</span>
          <button type="button" onClick={bulkCourier} disabled={busy} className="rounded bg-white px-3 py-1.5 text-gray-900 disabled:opacity-60">{busy ? "Sending..." : `Send to ${bulkOptions.find((item) => item.id === bulkProvider)?.label ?? "courier"}`}</button>
          {bulkOptions.length > 1 && (
            <select value={bulkProvider} onChange={(event) => setBulkProvider(event.target.value)} className="rounded bg-white px-2 py-1.5 text-gray-900" aria-label="Courier for bulk send">
              {bulkOptions.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
            </select>
          )}
          <button type="button" onClick={() => navigate(`/admin/invoices?ids=${selected.join(",")}`)} className="rounded bg-white px-3 py-1.5 text-gray-900">Print invoices</button>
          <button type="button" onClick={() => setSelected([])} className="ml-auto underline">Clear</button>
        </div>
      )}

      {message && <p className="mt-4 rounded-md bg-green-50 p-3 text-sm text-green-800" role="status">{message}</p>}
      {error && <p className="mt-4 text-sm text-red-600" role="alert">{error}</p>}
      {!orders && !error && <p className="mt-6 text-sm text-gray-500">Loading orders...</p>}

      {orders && (
        <div className="mt-5 overflow-x-auto rounded-xl border border-gray-200 bg-white">
          <table className="w-full min-w-225 text-left text-sm">
            <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
              <tr>
                <th className="w-10 px-4 py-3"><input type="checkbox" aria-label="Select all" checked={orders.length > 0 && selected.length === orders.length} onChange={(event) => setSelected(event.target.checked ? orders.map((order) => order.id) : [])} /></th>
                {["Order", "Customer", "Date", "Total", "Payment", "Status", "Courier"].map((heading) => <th key={heading} className="px-4 py-3 font-medium">{heading}</th>)}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {orders.length === 0 && <tr><td colSpan={8} className="px-4 py-10 text-center text-gray-500">No orders found.</td></tr>}
              {orders.map((order) => (
                <tr key={order.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3"><input type="checkbox" aria-label={`Select ${order.id}`} checked={selected.includes(order.id)} onChange={() => toggle(order.id)} /></td>
                  <td className="px-4 py-3"><Link href={`/admin/orders/${order.id}`} className="font-medium underline underline-offset-4">{order.id}</Link><p className="font-mono text-xs text-gray-500">{order.trackingId}</p></td>
                  <td className="px-4 py-3">{order.shipping.fullName}<p className="text-xs text-gray-500">{order.shipping.phone} · {order.shipping.city}</p></td>
                  <td className="px-4 py-3 text-gray-500">{new Date(order.createdAt).toLocaleDateString()}</td>
                  <td className="px-4 py-3 font-medium">{money(order.total)}</td>
                  <td className="px-4 py-3"><p>{methodLabel[order.paymentMethod]}</p><p className={`text-xs ${order.paymentStatus === "pending_verification" ? "font-semibold text-amber-700" : "text-gray-500"}`}>{paymentLabel[order.paymentStatus]}</p></td>
                  <td className="px-4 py-3"><span className={`rounded-full px-2.5 py-1 text-xs font-medium ${statusStyle[order.status]}`}>{order.status}</span></td>
                  <td className="px-4 py-3 font-mono text-xs">{order.courier?.trackingCode ?? "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
};

export default AdminOrders;
