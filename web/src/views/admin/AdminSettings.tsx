"use client";

import { useEffect, useState, type FormEvent } from "react";
import { api, type NotificationLog, type Settings } from "../../shared/api/client";
import { useAuth } from "../../shared/context/useAuth";

const field = "h-10 w-full rounded-md border border-gray-200 px-3 text-sm outline-none focus:border-black";
const card = "rounded-xl border border-gray-200 bg-white p-5";

const AdminSettings = () => {
  const { token } = useAuth();
  const [settings, setSettings] = useState<Settings | null>(null);
  const [log, setLog] = useState<NotificationLog[]>([]);
  const [newCategory, setNewCategory] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token) return;
    api.settings().then((response) => setSettings(response.settings)).catch((requestError: Error) => setError(requestError.message));
    api.admin.notifications(token).then((response) => setLog(response.notifications)).catch(() => undefined);
  }, [token]);

  if (!settings) return <p className="text-sm text-gray-500">{error || "Loading settings..."}</p>;

  const update = (patch: Partial<Settings>) => setSettings({ ...settings, ...patch });
  const num = (value: string) => Number(value) || 0;

  const save = (event: FormEvent) => {
    event.preventDefault();
    if (!token) return;
    setError("");
    setMessage("");
    api.admin.saveSettings(token, settings)
      .then(() => setMessage("Settings saved. Customers see the changes after they reload the page."))
      .catch((requestError: Error) => setError(requestError.message));
  };

  const addCategory = () => {
    const label = newCategory.trim();
    const slug = label.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
    if (!slug || settings.categories.some((category) => category.slug === slug)) return;
    update({ categories: [...settings.categories, { slug, label }] });
    setNewCategory("");
  };

  return (
    <form onSubmit={save} className="space-y-6">
      <section className={card}>
        <h2 className="font-semibold">Store</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <input className={field} placeholder="Store name" value={settings.storeName} onChange={(event) => update({ storeName: event.target.value })} />
          <input className={field} placeholder="Phone" value={settings.phone} onChange={(event) => update({ phone: event.target.value })} />
          <input className={field} placeholder="Email" value={settings.email} onChange={(event) => update({ email: event.target.value })} />
          <input className={field} placeholder="WhatsApp number, e.g. 8801700000000" value={settings.whatsappNumber} onChange={(event) => update({ whatsappNumber: event.target.value })} />
          <input className={`${field} sm:col-span-2`} placeholder="Address (shown on invoices)" value={settings.address} onChange={(event) => update({ address: event.target.value })} />
          <input className={`${field} sm:col-span-2`} placeholder="Invoice footer note" value={settings.invoiceNote} onChange={(event) => update({ invoiceNote: event.target.value })} />
        </div>
        <p className="mt-2 text-xs text-gray-500">The WhatsApp number powers the chat button on your site. Use digits only, with country code and no +.</p>
      </section>

      <section className={card}>
        <h2 className="font-semibold">Delivery charge</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <label className="text-sm">Inside Dhaka (৳)<input type="number" min="0" className={field} value={settings.shipping.insideDhaka} onChange={(event) => update({ shipping: { ...settings.shipping, insideDhaka: num(event.target.value) } })} /></label>
          <label className="text-sm">Outside Dhaka (৳)<input type="number" min="0" className={field} value={settings.shipping.outsideDhaka} onChange={(event) => update({ shipping: { ...settings.shipping, outsideDhaka: num(event.target.value) } })} /></label>
          <label className="text-sm">Free delivery over (৳, 0 = never)<input type="number" min="0" className={field} value={settings.shipping.freeOver} onChange={(event) => update({ shipping: { ...settings.shipping, freeOver: num(event.target.value) } })} /></label>
        </div>
      </section>

      <section className={card}>
        <h2 className="font-semibold">Payment methods</h2>
        <div className="mt-4 space-y-3 text-sm">
          <label className="flex items-center gap-2"><input type="checkbox" checked={settings.payments.cod} onChange={(event) => update({ payments: { ...settings.payments, cod: event.target.checked } })} /> Cash on delivery</label>
          <label className="flex items-center gap-2"><input type="checkbox" checked={settings.payments.sslcommerz} onChange={(event) => update({ payments: { ...settings.payments, sslcommerz: event.target.checked } })} /> Online payment (SSLCommerz: bKash, Nagad, cards, banks)</label>
          <div className="flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-2"><input type="checkbox" checked={settings.payments.bkash.enabled} onChange={(event) => update({ payments: { ...settings.payments, bkash: { ...settings.payments.bkash, enabled: event.target.checked } } })} /> bKash send money</label>
            <input className={`${field} max-w-48`} placeholder="bKash number" value={settings.payments.bkash.number} onChange={(event) => update({ payments: { ...settings.payments, bkash: { ...settings.payments.bkash, number: event.target.value } } })} />
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-2"><input type="checkbox" checked={settings.payments.nagad.enabled} onChange={(event) => update({ payments: { ...settings.payments, nagad: { ...settings.payments.nagad, enabled: event.target.checked } } })} /> Nagad send money</label>
            <input className={`${field} max-w-48`} placeholder="Nagad number" value={settings.payments.nagad.number} onChange={(event) => update({ payments: { ...settings.payments, nagad: { ...settings.payments.nagad, number: event.target.value } } })} />
          </div>
        </div>
      </section>

      <section className={card}>
        <h2 className="font-semibold">Categories</h2>
        <div className="mt-4 flex flex-wrap gap-2">
          {settings.categories.map((category) => (
            <span key={category.slug} className="flex items-center gap-2 rounded-full bg-gray-100 px-3 py-1 text-sm">
              {category.label}
              {settings.categories.length > 1 && <button type="button" aria-label={`Remove ${category.label}`} onClick={() => update({ categories: settings.categories.filter((item) => item.slug !== category.slug) })} className="text-gray-500 hover:text-black">×</button>}
            </span>
          ))}
        </div>
        <div className="mt-3 flex gap-2"><input className={`${field} max-w-xs`} placeholder="New category (e.g. Jackets)" value={newCategory} onChange={(event) => setNewCategory(event.target.value)} /><button type="button" onClick={addCategory} className="rounded-md border border-black px-4 text-sm">Add</button></div>
      </section>

      <section className={card}>
        <h2 className="font-semibold">SMS to customers</h2>
        <div className="mt-4 space-y-2 text-sm">
          <label className="flex items-center gap-2"><input type="checkbox" checked={settings.sms.orderConfirmation} onChange={(event) => update({ sms: { ...settings.sms, orderConfirmation: event.target.checked } })} /> Send order confirmation with tracking ID</label>
          <label className="flex items-center gap-2"><input type="checkbox" checked={settings.sms.statusUpdates} onChange={(event) => update({ sms: { ...settings.sms, statusUpdates: event.target.checked } })} /> Send status updates (shipped, delivered, cancelled)</label>
        </div>
      </section>

      {message && <p className="rounded-md bg-green-50 p-3 text-sm text-green-800" role="status">{message}</p>}
      {error && <p className="text-sm text-red-600" role="alert">{error}</p>}
      <button type="submit" className="rounded-md bg-black px-6 py-2.5 text-sm font-medium text-white">Save settings</button>

      <section className={card}>
        <h2 className="font-semibold">Recent SMS and emails</h2>
        {log.length === 0 && <p className="mt-3 text-sm text-gray-500">Nothing sent yet.</p>}
        <ul className="mt-3 divide-y text-sm">
          {log.slice(0, 15).map((item) => (
            <li key={item.id} className="py-2">
              <p><span className={`mr-2 rounded px-2 py-0.5 text-xs ${item.ok ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>{item.ok ? "sent" : "failed"}</span><b className="uppercase">{item.channel}</b> to {item.to} <span className="text-gray-400">{new Date(item.at).toLocaleString()}</span></p>
              <p className="text-gray-600">{item.message}</p>
              {!item.ok && <p className="text-xs text-red-700">{item.detail}</p>}
            </li>
          ))}
        </ul>
      </section>
    </form>
  );
};

export default AdminSettings;
