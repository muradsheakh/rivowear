export const statusStyle: Record<string, string> = {
  Pending: "bg-yellow-100 text-yellow-800",
  Processing: "bg-blue-100 text-blue-800",
  Shipped: "bg-purple-100 text-purple-800",
  Delivered: "bg-green-100 text-green-800",
  Cancelled: "bg-red-100 text-red-800",
  Returned: "bg-orange-100 text-orange-800",
};

export const paymentLabel: Record<string, string> = {
  unpaid: "Unpaid",
  pending_verification: "Verify payment",
  paid: "Paid",
  failed: "Failed",
  refunded: "Refunded",
};

export const methodLabel: Record<string, string> = {
  cod: "Cash on delivery",
  sslcommerz: "Online (SSLCommerz)",
  bkash_manual: "bKash (manual)",
  nagad_manual: "Nagad (manual)",
};
