"use client";

import { useEffect, useState, type FormEvent } from "react";
import { api, type Coupon } from "../../shared/api/client";
import { useAuth } from "../../shared/context/useAuth";

const field = "h-10 rounded-md border border-gray-200 px-3 text-sm outline-none focus:border-black";

const AdminCoupons = () => {
  const { token } = useAuth();
  const [coupons, setCoupons] = useState<Coupon[] | null>(null);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ code: "", type: "percent" as Coupon["type"], value: "", minSubtotal: "0", expiresAt: "", usageLimit: "" });

  useEffect(() => {
    if (!token) return;
    api.admin.coupons(token).then((response) => setCoupons(response.coupons)).catch((requestError: Error) => setError(requestError.message));
  }, [token]);

  const create = (event: FormEvent) => {
    event.preventDefault();
    if (!token) return;
    setError("");
    api.admin
      .createCoupon(token, {
        code: form.code.trim(), type: form.type, value: Number(form.value), minSubtotal: Number(form.minSubtotal) || 0,
        expiresAt: form.expiresAt ? new Date(`${form.expiresAt}T23:59:59`).toISOString() : undefined,
        usageLimit: form.usageLimit ? Number(form.usageLimit) : undefined, active: true,
      })
      .then(({ coupon }) => {
        setCoupons((current) => [...(current ?? []), coupon]);
        setForm({ code: "", type: "percent", value: "", minSubtotal: "0", expiresAt: "", usageLimit: "" });
      })
      .catch((requestError: Error) => setError(requestError.message));
  };

  const toggle = (coupon: Coupon) => {
    if (!token) return;
    api.admin.toggleCoupon(token, coupon.code, !coupon.active)
      .then(() => setCoupons((current) => current?.map((item) => (item.code === coupon.code ? { ...item, active: !item.active } : item)) ?? null))
      .catch((requestError: Error) => setError(requestError.message));
  };

  const remove = (coupon: Coupon) => {
    if (!token || !window.confirm(`Delete coupon ${coupon.code}?`)) return;
    api.admin.deleteCoupon(token, coupon.code)
      .then(() => setCoupons((current) => current?.filter((item) => item.code !== coupon.code) ?? null))
      .catch((requestError: Error) => setError(requestError.message));
  };

  return (
    <>
      <form onSubmit={create} className="flex flex-wrap items-end gap-3 rounded-xl border border-gray-200 bg-white p-5">
        <input required placeholder="CODE" value={form.code} onChange={(event) => setForm({ ...form, code: event.target.value })} className={`${field} w-32 uppercase`} aria-label="Coupon code" />
        <select value={form.type} onChange={(event) => setForm({ ...form, type: event.target.value as Coupon["type"] })} className={field} aria-label="Type"><option value="percent">Percent %</option><option value="fixed">Fixed ৳</option></select>
        <input required type="number" min="1" placeholder="Value" value={form.value} onChange={(event) => setForm({ ...form, value: event.target.value })} className={`${field} w-24`} aria-label="Value" />
        <input type="number" min="0" placeholder="Min order" value={form.minSubtotal} onChange={(event) => setForm({ ...form, minSubtotal: event.target.value })} className={`${field} w-28`} aria-label="Minimum order" />
        <input type="date" value={form.expiresAt} onChange={(event) => setForm({ ...form, expiresAt: event.target.value })} className={field} aria-label="Expiry date" />
        <input type="number" min="1" placeholder="Max uses" value={form.usageLimit} onChange={(event) => setForm({ ...form, usageLimit: event.target.value })} className={`${field} w-28`} aria-label="Usage limit" />
        <button type="submit" className="h-10 rounded-md bg-black px-5 text-sm text-white">Create coupon</button>
      </form>
      {error && <p className="mt-4 text-sm text-red-600" role="alert">{error}</p>}
      <div className="mt-6 overflow-x-auto rounded-xl border border-gray-200 bg-white">
        <table className="w-full min-w-150 text-left text-sm">
          <thead className="bg-gray-50 text-xs text-gray-500 uppercase"><tr>{["Code", "Discount", "Min order", "Used", "Expires", ""].map((heading) => <th key={heading} className="px-5 py-3 font-medium">{heading}</th>)}</tr></thead>
          <tbody className="divide-y divide-gray-100">
            {coupons?.length === 0 && <tr><td colSpan={6} className="px-5 py-8 text-center text-gray-500">No coupons yet.</td></tr>}
            {coupons?.map((coupon) => (
              <tr key={coupon.code}>
                <td className="px-5 py-3 font-mono font-medium">{coupon.code}{!coupon.active && <span className="ml-2 rounded bg-gray-100 px-2 py-0.5 font-sans text-xs">off</span>}</td>
                <td className="px-5 py-3">{coupon.type === "percent" ? `${coupon.value}%` : `৳${coupon.value}`}</td>
                <td className="px-5 py-3">৳{coupon.minSubtotal}</td>
                <td className="px-5 py-3">{coupon.used}{coupon.usageLimit ? ` / ${coupon.usageLimit}` : ""}</td>
                <td className="px-5 py-3 text-gray-500">{coupon.expiresAt ? new Date(coupon.expiresAt).toLocaleDateString() : "Never"}</td>
                <td className="px-5 py-3 text-right whitespace-nowrap"><button type="button" onClick={() => toggle(coupon)} className="mr-4 underline underline-offset-4">{coupon.active ? "Turn off" : "Turn on"}</button><button type="button" onClick={() => remove(coupon)} className="text-red-700 underline underline-offset-4">Delete</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
};

export default AdminCoupons;
