"use client";

import { money } from "../../shared/money";
import { useEffect, useState } from "react";
import { api, type Customer } from "../../shared/api/client";
import { useAuth } from "../../shared/context/useAuth";

const AdminCustomers = () => {
  const { token } = useAuth();
  const [customers, setCustomers] = useState<Customer[] | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token) return;
    api.admin
      .customers(token)
      .then((response) => setCustomers(response.customers))
      .catch((requestError: Error) => setError(requestError.message));
  }, [token]);

  if (error) return <p className="text-sm text-red-600" role="alert">{error}</p>;
  if (!customers) return <p className="text-sm text-gray-500">Loading customers...</p>;

  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
      <table className="w-full min-w-150 text-left text-sm">
        <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
          <tr>
            {["Name", "Contact", "Type", "Since", "Orders", "Spent"].map((heading) => (
              <th key={heading} className="px-5 py-3 font-medium">{heading}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {customers.length === 0 && <tr><td colSpan={6} className="px-5 py-8 text-center text-gray-500">No customers yet.</td></tr>}
          {customers.map((customer) => (
            <tr key={customer.id} className="hover:bg-gray-50">
              <td className="px-5 py-4 font-medium">{customer.name}</td>
              <td className="px-5 py-4">{customer.contact}</td>
              <td className="px-5 py-4">{customer.registered ? "Account" : "Guest"}</td>
              <td className="px-5 py-4 text-gray-500">{new Date(customer.createdAt).toLocaleDateString()}</td>
              <td className="px-5 py-4">{customer.orders}</td>
              <td className="px-5 py-4 font-medium">{money(customer.spent)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default AdminCustomers;
