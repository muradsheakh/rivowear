"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "@/shared/router";
import Invoice from "../components/Invoice";
import { api, type Order, type Settings } from "../shared/api/client";

/** Customer invoice, opened with tracking ID + the phone number used for the order. */
const InvoicePage = () => {
  const { trackingId = "" } = useParams();
  const [params] = useSearchParams();
  const phone = params.get("phone") ?? "";
  const [state, setState] = useState<{ order?: Order; settings?: Settings; error?: string } | null>(null);

  useEffect(() => {
    api
      .guestInvoice(trackingId, phone)
      .then((response) => setState(response))
      .catch((error: Error) => setState({ error: error.message }));
  }, [trackingId, phone]);

  return (
    <div className="min-h-screen bg-gray-100 py-8 print:bg-white print:py-0">
      <div className="mx-auto mb-4 flex max-w-3xl justify-between px-4 print:hidden">
        <Link href={`/track/${trackingId}`} className="text-sm underline">← Back to tracking</Link>
        <button type="button" onClick={() => window.print()} className="rounded-md bg-black px-5 py-2 text-sm text-white">Print / Save as PDF</button>
      </div>
      {!state && <p className="text-center text-sm text-gray-500">Loading invoice...</p>}
      {state?.error && <p className="text-center text-sm text-red-600" role="alert">{state.error}</p>}
      {state?.order && state.settings && <Invoice order={state.order} settings={state.settings} />}
    </div>
  );
};

export default InvoicePage;
