"use client";

import { useEffect, useState, type FormEvent } from "react";
import { api, type Address, type AddressInput } from "../../shared/api/client";
import { useAuth } from "../../shared/context/useAuth";

const field = "h-11 w-full rounded-md border border-gray-200 px-3 text-sm outline-none focus:border-black";
const blank: AddressInput = { label: "Home", fullName: "", phone: "", address: "", city: "", postalCode: "", isDefault: false };

const Addresses = () => {
  const { token, user } = useAuth();
  const [addresses, setAddresses] = useState<Address[] | null>(null);
  const [editing, setEditing] = useState<string | "new" | null>(null);
  const [form, setForm] = useState<AddressInput>(blank);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!token) return;
    api.addresses(token).then((response) => setAddresses(response.addresses)).catch((requestError: Error) => setError(requestError.message));
  }, [token]);

  const open = (target: Address | "new") => {
    setError("");
    if (target === "new") {
      setEditing("new");
      setForm({ ...blank, fullName: user?.name ?? "", phone: user?.phone ?? "", isDefault: addresses?.length === 0 });
    } else {
      setEditing(target.id);
      setForm({ label: target.label, fullName: target.fullName, phone: target.phone, address: target.address, city: target.city, postalCode: target.postalCode, isDefault: target.isDefault });
    }
  };

  const save = (event: FormEvent) => {
    event.preventDefault();
    if (!token || !editing) return;
    setBusy(true);
    setError("");
    const request = editing === "new" ? api.addAddress(token, form) : api.updateAddress(token, editing, form);
    request
      .then(() => api.addresses(token))
      .then((response) => {
        setAddresses(response.addresses);
        setEditing(null);
      })
      .catch((requestError: Error) => setError(requestError.message))
      .finally(() => setBusy(false));
  };

  const makeDefault = (id: string) => token && api.setDefaultAddress(token, id).then((response) => setAddresses(response.addresses)).catch((requestError: Error) => setError(requestError.message));
  const remove = (id: string) => {
    if (!token || !window.confirm("Delete this address?")) return;
    api.deleteAddress(token, id).then((response) => setAddresses(response.addresses)).catch((requestError: Error) => setError(requestError.message));
  };

  return (
    <div>
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Saved addresses</h2>
        {editing === null && <button type="button" onClick={() => open("new")} className="rounded-md bg-black px-4 py-2 text-sm font-medium text-white">Add address</button>}
      </div>
      <p className="mt-1 text-sm text-gray-500">Pick one at checkout to fill in your delivery details in one tap.</p>
      {error && editing === null && <p className="mt-4 text-sm text-red-600" role="alert">{error}</p>}

      {editing !== null && (
        <form onSubmit={save} className="mt-5 grid gap-4 rounded-xl border border-gray-200 bg-white p-6 sm:grid-cols-2">
          <h3 className="font-semibold sm:col-span-2">{editing === "new" ? "New address" : "Edit address"}</h3>
          <label className="text-sm font-medium">
            Label
            <select value={["Home", "Office"].includes(form.label) ? form.label : "Other"} onChange={(event) => setForm({ ...form, label: event.target.value })} className={`${field} mt-1`}>
              <option>Home</option><option>Office</option><option>Other</option>
            </select>
          </label>
          <label className="text-sm font-medium">
            Receiver&apos;s name
            <input required value={form.fullName} onChange={(event) => setForm({ ...form, fullName: event.target.value })} className={`${field} mt-1`} />
          </label>
          <label className="text-sm font-medium">
            Mobile number
            <input required type="tel" value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} placeholder="01XXXXXXXXX" className={`${field} mt-1`} />
          </label>
          <label className="text-sm font-medium">
            City / District
            <input required value={form.city} onChange={(event) => setForm({ ...form, city: event.target.value })} placeholder="Dhaka" className={`${field} mt-1`} />
          </label>
          <label className="text-sm font-medium sm:col-span-2">
            Full address
            <input required value={form.address} onChange={(event) => setForm({ ...form, address: event.target.value })} placeholder="House, road, area" className={`${field} mt-1`} />
          </label>
          <label className="text-sm font-medium">
            Postal code (optional)
            <input value={form.postalCode} onChange={(event) => setForm({ ...form, postalCode: event.target.value })} className={`${field} mt-1`} />
          </label>
          <label className="flex items-center gap-2 text-sm sm:self-end sm:pb-3">
            <input type="checkbox" checked={Boolean(form.isDefault)} onChange={(event) => setForm({ ...form, isDefault: event.target.checked })} /> Make this my default address
          </label>
          {error && <p className="text-sm text-red-600 sm:col-span-2" role="alert">{error}</p>}
          <div className="flex gap-3 sm:col-span-2">
            <button type="submit" disabled={busy} className="rounded-md bg-black px-5 py-2 text-sm font-medium text-white disabled:opacity-60">{busy ? "Saving..." : "Save address"}</button>
            <button type="button" onClick={() => setEditing(null)} className="rounded-md border border-gray-200 px-5 py-2 text-sm">Cancel</button>
          </div>
        </form>
      )}

      {!addresses && !error && <p className="mt-6 text-sm text-gray-500">Loading...</p>}
      {addresses?.length === 0 && editing === null && <p className="mt-8 rounded-xl border border-dashed border-gray-300 p-8 text-center text-sm text-gray-500">No saved addresses yet.</p>}
      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        {addresses?.map((address) => (
          <article key={address.id} className="rounded-xl border border-gray-200 bg-white p-5 text-sm">
            <div className="flex items-center justify-between">
              <p className="font-semibold">{address.label}</p>
              {address.isDefault && <span className="rounded-full bg-black px-2.5 py-0.5 text-xs text-white">Default</span>}
            </div>
            <p className="mt-3 font-medium">{address.fullName}</p>
            <p className="text-gray-600">{address.address}</p>
            <p className="text-gray-600">{address.city} {address.postalCode}</p>
            <p className="text-gray-600">{address.phone}</p>
            <div className="mt-4 flex flex-wrap gap-4">
              <button type="button" onClick={() => open(address)} className="underline underline-offset-4">Edit</button>
              {!address.isDefault && <button type="button" onClick={() => void makeDefault(address.id)} className="underline underline-offset-4">Make default</button>}
              <button type="button" onClick={() => remove(address.id)} className="text-red-700 underline underline-offset-4">Delete</button>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
};

export default Addresses;
