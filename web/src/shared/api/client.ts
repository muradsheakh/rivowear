const PUBLIC_API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api";
// Pages rendered on the server may reach the API through a private address (for example inside Docker).
const API_URL = typeof window === "undefined" ? (process.env.API_INTERNAL_URL ?? PUBLIC_API_URL) : PUBLIC_API_URL;

type ApiError = { message?: string };

const request = async <T>(
  path: string,
  options: RequestInit = {},
  token?: string | null,
): Promise<T> => {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });
  const body = (await response.json().catch(() => ({}))) as T & ApiError;
  if (!response.ok) throw new Error(body.message ?? "Something went wrong. Please try again.");
  return body;
};

const json = (body: unknown) => JSON.stringify(body);

export type AuthUser = {
  id: string;
  name: string;
  contact: string;
  email: string | null;
  phone: string | null;
  role: "customer" | "admin";
  createdAt?: string;
};

export type Address = {
  id: string;
  label: string;
  fullName: string;
  phone: string;
  address: string;
  city: string;
  postalCode: string;
  isDefault: boolean;
};

export type AddressInput = Omit<Address, "id" | "isDefault"> & { isDefault?: boolean };

export type AccountStats = { orders: number; delivered: number; spent: number; reviews: number; wishlist: number; addresses: number };

export type MyReview = { id: string; productId: string; productName: string; productImage: string; rating: number; comment: string; images: string[]; hidden: boolean; createdAt: string };

export type Gender = "men" | "women" | "unisex";

export type ProductColor = { name: string; hex: string; images: string[] };

export type Variant = { color: string; size: string; stock: number };

export type Rating = { average: number; count: number };

export type Product = {
  id: string;
  name: string;
  description: string;
  price: number;
  image: string;
  category: string;
  gender: Gender;
  brand: string;
  material: string;
  sizes: string[];
  colors: ProductColor[];
  /** Stock for each color and size. */
  variants: Variant[];
  /** Total across every color and size. */
  stock: number;
  isNewArrival: boolean;
  isBestSeller: boolean;
  createdAt: string;
  rating?: Rating;
};

export type ProductInput = Omit<Product, "id" | "createdAt" | "rating" | "image" | "stock"> & { image?: string };

export type ProductFilters = {
  category?: string;
  gender?: string;
  color?: string;
  q?: string;
  sort?: string;
  minPrice?: string;
  maxPrice?: string;
  isNew?: boolean;
  bestSeller?: boolean;
  inStock?: boolean;
  limit?: number;
};

export type CartLine = { productId: string; size: string; color: string; quantity: number };

export type OrderStatus = "Pending" | "Processing" | "Shipped" | "Delivered" | "Cancelled" | "Returned";
export type PaymentMethod = "cod" | "sslcommerz" | "bkash_manual" | "nagad_manual";
export type PaymentStatus = "unpaid" | "pending_verification" | "paid" | "failed" | "refunded";

export type ShippingInfo = {
  fullName: string;
  phone: string;
  email?: string;
  address: string;
  city: string;
  postalCode?: string;
  note?: string;
};

export type OrderEvent = { status: string; note: string; at: string };

export type Order = {
  id: string;
  trackingId: string;
  userId: string | null;
  customer?: string;
  items: (CartLine & { name: string; price: number; image: string })[];
  shipping: ShippingInfo;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  payment?: { tranId?: string; trxId?: string; senderNumber?: string; paidAt?: string };
  subtotal: number;
  shippingFee: number;
  discount: number;
  couponCode?: string;
  total: number;
  status: OrderStatus;
  courier?: { provider: string; name?: string; consignmentId: string | number; trackingCode: string; status: string; sentAt: string; mock?: boolean };
  history: OrderEvent[];
  createdAt: string;
};

export type Tracking = {
  trackingId: string;
  orderId: string;
  status: OrderStatus;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  total: number;
  city: string;
  createdAt: string;
  items: { name: string; image: string; size: string; color: string; quantity: number }[];
  history: OrderEvent[];
  courier: { provider: string; name: string; trackingCode: string; trackUrl: string | null } | null;
};

export type Settings = {
  storeName: string;
  phone: string;
  email: string;
  address: string;
  whatsappNumber: string;
  categories: { slug: string; label: string }[];
  shipping: { insideDhaka: number; outsideDhaka: number; freeOver: number };
  payments: {
    cod: boolean;
    sslcommerz: boolean;
    bkash: { enabled: boolean; number: string };
    nagad: { enabled: boolean; number: string };
  };
  invoiceNote: string;
  sms: { orderConfirmation: boolean; statusUpdates: boolean };
};

export type CheckoutOptions = {
  cod: boolean;
  online: boolean;
  bkash: { number: string } | null;
  nagad: { number: string } | null;
  /** true = Cash on Delivery orders need an SMS code check first. */
  phoneVerification?: boolean;
};

export type Quote = { subtotal: number; discount: number; shippingFee: number; total: number; couponCode?: string };

export type PlaceOrderInput = {
  items: CartLine[];
  shipping: ShippingInfo;
  paymentMethod: PaymentMethod;
  couponCode?: string;
  manualPayment?: { trxId: string; senderNumber: string };
  phoneProof?: string;
};

export type Review = { id: string; userName: string; rating: number; comment: string; images: string[]; createdAt: string };
export type ReviewSummary = { average: number; count: number; distribution: { stars: number; count: number }[] };
export type AdminReview = Review & { productId: string; productName: string; orderId: string; hidden: boolean };

export type Coupon = {
  code: string;
  type: "percent" | "fixed";
  value: number;
  minSubtotal: number;
  expiresAt?: string;
  usageLimit?: number;
  used: number;
  active: boolean;
};

export type AdminSummary = {
  revenue: number;
  orders: number;
  todayOrders: number;
  products: number;
  customers: number;
  pendingOrders: number;
  paymentsToVerify: number;
  statusCounts: { status: OrderStatus; count: number }[];
  salesByDay: { date: string; orders: number; revenue: number }[];
  topProducts: { id: string; name: string; quantity: number; revenue: number }[];
  lowStock: { id: string; name: string; variant: string; stock: number }[];
  recentOrders: Order[];
};

export type Customer = {
  id: string;
  name: string;
  contact: string;
  registered: boolean;
  createdAt: string;
  orders: number;
  spent: number;
};

export type NotificationLog = { id: string; channel: "sms" | "email"; to: string; message: string; ok: boolean; detail: string; at: string };

export type CourierOption = { id: string; label: string; manual: boolean };

export type FailedMessage = { id: string; channel: "sms" | "email"; recipient: string; subject: string | null; body: string; attempts: number; lastError: string; createdAt: string };

export const API_BASE = PUBLIC_API_URL;

const toQuery = (filters: ProductFilters) => {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== "" && value !== false) params.set(key, String(value));
  });
  const query = params.toString();
  return query ? `?${query}` : "";
};

type AuthResponse = { token: string; user: AuthUser };

const upload = async (path: string, files: File[], token: string): Promise<string[]> => {
  const form = new FormData();
  files.forEach((file) => form.append("images", file));
  const response = await fetch(`${API_URL}${path}`, { method: "POST", body: form, headers: { Authorization: `Bearer ${token}` } });
  const body = (await response.json().catch(() => ({}))) as { urls?: string[] } & ApiError;
  if (!response.ok) throw new Error(body.message ?? "Upload failed.");
  return body.urls ?? [];
};

export const api = {
  login: (contact: string, password: string) =>
    request<AuthResponse>("/auth/login", { method: "POST", body: json({ contact, password }) }),
  register: (name: string, contact: string, password: string) =>
    request<{ user: AuthUser }>("/auth/register", { method: "POST", body: json({ name, contact, password }) }),
  me: (token: string) => request<{ user: AuthUser }>("/auth/me", {}, token),
  forgotPassword: (contact: string) =>
    request<{ message: string }>("/auth/forgot-password", { method: "POST", body: json({ contact }) }),
  resetPassword: (contact: string, code: string, password: string) =>
    request<{ message: string }>("/auth/reset-password", { method: "POST", body: json({ contact, code, password }) }),
  logout: (token: string) => request<void>("/auth/logout", { method: "POST" }, token),

  account: (token: string) => request<{ user: AuthUser; stats: AccountStats }>("/account", {}, token),
  updateProfile: (token: string, data: { name: string; email: string; phone: string }) =>
    request<{ user: AuthUser }>("/account", { method: "PATCH", body: json(data) }, token),
  changePassword: (token: string, currentPassword: string, newPassword: string) =>
    request<{ token: string; message: string }>("/account/password", { method: "POST", body: json({ currentPassword, newPassword }) }, token),
  logoutEverywhere: (token: string) => request<{ token: string; message: string }>("/account/logout-all", { method: "POST" }, token),
  deleteAccount: (token: string, password: string) => request<void>("/account", { method: "DELETE", body: json({ password }) }, token),
  addresses: (token: string) => request<{ addresses: Address[] }>("/account/addresses", {}, token),
  addAddress: (token: string, input: AddressInput) =>
    request<{ address: Address }>("/account/addresses", { method: "POST", body: json(input) }, token),
  updateAddress: (token: string, id: string, input: AddressInput) =>
    request<{ address: Address }>(`/account/addresses/${encodeURIComponent(id)}`, { method: "PATCH", body: json(input) }, token),
  setDefaultAddress: (token: string, id: string) =>
    request<{ addresses: Address[] }>(`/account/addresses/${encodeURIComponent(id)}/default`, { method: "POST" }, token),
  deleteAddress: (token: string, id: string) =>
    request<{ addresses: Address[] }>(`/account/addresses/${encodeURIComponent(id)}`, { method: "DELETE" }, token),
  myReviews: (token: string) => request<{ reviews: MyReview[] }>("/account/reviews", {}, token),
  editReview: (token: string, id: string, rating: number, comment: string) =>
    request<{ review: MyReview }>(`/account/reviews/${encodeURIComponent(id)}`, { method: "PATCH", body: json({ rating, comment }) }, token),
  deleteMyReview: (token: string, id: string) => request<void>(`/account/reviews/${encodeURIComponent(id)}`, { method: "DELETE" }, token),
  claimOrder: (token: string, trackingId: string, phone: string) =>
    request<{ order: Tracking }>("/account/claim-order", { method: "POST", body: json({ trackingId, phone }) }, token),

  settings: () => request<{ settings: Settings }>("/settings"),
  products: (filters: ProductFilters = {}) =>
    request<{ products: Product[]; total: number }>(`/products${toQuery(filters)}`),
  colors: () => request<{ colors: { name: string; hex: string }[] }>("/colors"),
  product: (id: string) => request<{ product: Product }>(`/products/${encodeURIComponent(id)}`),
  similarProducts: (id: string) => request<{ products: Product[] }>(`/products/${encodeURIComponent(id)}/similar`),

  cart: (token: string) => request<{ items: (CartLine & { product: Product })[] }>("/cart", {}, token),
  saveCart: (token: string, items: CartLine[]) =>
    request<unknown>("/cart", { method: "PUT", body: json({ items }) }, token),

  wishlist: (token: string) => request<{ ids: string[]; products: Product[] }>("/wishlist", {}, token),
  addWishlist: (token: string, id: string) =>
    request<{ ids: string[] }>(`/wishlist/${encodeURIComponent(id)}`, { method: "PUT" }, token),
  removeWishlist: (token: string, id: string) =>
    request<{ ids: string[] }>(`/wishlist/${encodeURIComponent(id)}`, { method: "DELETE" }, token),

  checkoutOptions: () => request<CheckoutOptions>("/checkout/options"),
  quote: (items: CartLine[], city: string, couponCode?: string) =>
    request<Quote>("/checkout/quote", { method: "POST", body: json({ items, city, couponCode: couponCode || undefined }) }),
  sendCheckoutOtp: (phone: string) =>
    request<{ message: string }>("/checkout/otp/send", { method: "POST", body: json({ phone }) }),
  verifyCheckoutOtp: (phone: string, code: string) =>
    request<{ phoneProof: string }>("/checkout/otp/verify", { method: "POST", body: json({ phone, code }) }),
  placeOrder: (input: PlaceOrderInput, token?: string | null) =>
    request<{ order: Order; paymentUrl?: string }>("/orders", { method: "POST", body: json(input) }, token),
  myOrders: (token: string) => request<{ orders: Order[] }>("/orders", {}, token),
  cancelOrder: (token: string, id: string) =>
    request<{ order: Order }>(`/orders/${encodeURIComponent(id)}/cancel`, { method: "POST" }, token),

  track: (trackingId: string) => request<{ tracking: Tracking }>(`/track/${encodeURIComponent(trackingId)}`),
  trackStreamUrl: (trackingId: string) => `${API_URL}/track/${encodeURIComponent(trackingId)}/stream`,
  guestInvoice: (trackingId: string, phone: string) =>
    request<{ order: Order; settings: Settings }>(`/track/${encodeURIComponent(trackingId)}/invoice?phone=${encodeURIComponent(phone)}`),
  retryPayment: (trackingId: string, phone: string) =>
    request<{ paymentUrl: string }>(`/track/${encodeURIComponent(trackingId)}/pay`, { method: "POST", body: json({ phone }) }),

  reviews: (productId: string) =>
    request<{ reviews: Review[]; summary: ReviewSummary }>(`/products/${encodeURIComponent(productId)}/reviews`),
  reviewStatus: (token: string, productId: string) =>
    request<{ canReview: boolean; hasReviewed: boolean; reason: string }>(`/products/${encodeURIComponent(productId)}/review-status`, {}, token),
  addReview: (token: string, productId: string, review: { rating: number; comment: string; images: string[] }) =>
    request<{ review: Review }>(`/products/${encodeURIComponent(productId)}/reviews`, { method: "POST", body: json(review) }, token),
  uploadReviewImages: (token: string, files: File[]) => upload("/uploads/review", files, token),

  admin: {
    summary: (token: string) => request<AdminSummary>("/admin/summary", {}, token),
    orders: (token: string, filters: { q?: string; status?: string; payment?: string } = {}) =>
      request<{ orders: Order[] }>(`/admin/orders${toQuery(filters as ProductFilters)}`, {}, token),
    order: (token: string, id: string) =>
      request<{ order: Order; settings: Settings }>(`/admin/orders/${encodeURIComponent(id)}`, {}, token),
    setOrderStatus: (token: string, id: string, status: OrderStatus, note?: string) =>
      request<{ order: Order }>(`/admin/orders/${encodeURIComponent(id)}/status`, { method: "PATCH", body: json({ status, note }) }, token),
    setPaymentStatus: (token: string, id: string, paymentStatus: PaymentStatus) =>
      request<{ order: Order }>(`/admin/orders/${encodeURIComponent(id)}/payment`, { method: "PATCH", body: json({ paymentStatus }) }, token),
    couriers: (token: string) => request<{ couriers: CourierOption[]; default: string }>("/admin/couriers", {}, token),
    sendToCourier: (token: string, id: string, details: { provider?: string; courierName?: string; trackingCode?: string } = {}) =>
      request<{ order: Order }>(`/admin/orders/${encodeURIComponent(id)}/courier`, { method: "POST", body: json(details) }, token),
    bulkCourier: (token: string, ids: string[], provider?: string) =>
      request<{ results: { id: string; ok: boolean; message: string }[] }>("/admin/orders/courier/bulk", { method: "POST", body: json({ ids, provider }) }, token),
    syncCourier: (token: string) => request<{ updated: number }>("/admin/orders/sync-courier", { method: "POST" }, token),
    exportCsv: async (token: string) => {
      const response = await fetch(`${API_URL}/admin/orders/export.csv`, { headers: { Authorization: `Bearer ${token}` } });
      if (!response.ok) throw new Error("Could not export orders.");
      return response.blob();
    },
    customers: (token: string) => request<{ customers: Customer[] }>("/admin/customers", {}, token),
    createProduct: (token: string, input: ProductInput) =>
      request<{ product: Product }>("/admin/products", { method: "POST", body: json(input) }, token),
    updateProduct: (token: string, id: string, input: Partial<ProductInput>) =>
      request<{ product: Product }>(`/admin/products/${encodeURIComponent(id)}`, { method: "PUT", body: json(input) }, token),
    deleteProduct: (token: string, id: string) =>
      request<void>(`/admin/products/${encodeURIComponent(id)}`, { method: "DELETE" }, token),
    uploadImages: (token: string, files: File[]) => upload("/admin/uploads", files, token),
    reviews: (token: string) => request<{ reviews: AdminReview[] }>("/admin/reviews", {}, token),
    hideReview: (token: string, id: string, hidden: boolean) =>
      request<unknown>(`/admin/reviews/${encodeURIComponent(id)}`, { method: "PATCH", body: json({ hidden }) }, token),
    deleteReview: (token: string, id: string) =>
      request<void>(`/admin/reviews/${encodeURIComponent(id)}`, { method: "DELETE" }, token),
    coupons: (token: string) => request<{ coupons: Coupon[] }>("/admin/coupons", {}, token),
    createCoupon: (token: string, coupon: Omit<Coupon, "used">) =>
      request<{ coupon: Coupon }>("/admin/coupons", { method: "POST", body: json(coupon) }, token),
    toggleCoupon: (token: string, code: string, active: boolean) =>
      request<unknown>(`/admin/coupons/${encodeURIComponent(code)}`, { method: "PATCH", body: json({ active }) }, token),
    deleteCoupon: (token: string, code: string) =>
      request<void>(`/admin/coupons/${encodeURIComponent(code)}`, { method: "DELETE" }, token),
    saveSettings: (token: string, settings: Settings) =>
      request<{ settings: Settings }>("/admin/settings", { method: "PUT", body: json(settings) }, token),
    notifications: (token: string) => request<{ notifications: NotificationLog[] }>("/admin/notifications", {}, token),
    failedMessages: (token: string) => request<{ messages: FailedMessage[]; counts: { pending: number; dead: number } }>("/admin/outbox/failed", {}, token),
    retryMessage: (token: string, id: string) => request<unknown>(`/admin/outbox/${encodeURIComponent(id)}/retry`, { method: "POST" }, token),
    discardMessage: (token: string, id: string) => request<void>(`/admin/outbox/${encodeURIComponent(id)}`, { method: "DELETE" }, token),
  },
};
