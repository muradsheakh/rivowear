export type Role = "customer" | "admin";

export type User = {
  id: string;
  name: string;
  /** What the person signed up with (email or phone). Kept so old logins keep working. */
  contact: string;
  email: string | null;
  phone: string | null;
  role: Role;
  passwordHash: string;
  /** Logins created before this moment are no longer accepted. */
  sessionsValidFrom: string;
  createdAt: string;
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

export type Gender = "men" | "women" | "unisex";

export type ProductColor = { name: string; hex: string; images: string[] };

export type Variant = { color: string; size: string; stock: number };

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
  /** Total across all variants (calculated, never saved). */
  stock: number;
  isNewArrival: boolean;
  isBestSeller: boolean;
  createdAt: string;
};

export type CartItem = { productId: string; size: string; color: string; quantity: number };

export type OrderStatus = "Pending" | "Processing" | "Shipped" | "Delivered" | "Cancelled" | "Returned";
export type PaymentMethod = "cod" | "sslcommerz" | "bkash_manual" | "nagad_manual";
export type PaymentStatus = "unpaid" | "pending_verification" | "paid" | "failed" | "refunded";

export type OrderItem = CartItem & { name: string; price: number; image: string };

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
  items: OrderItem[];
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
  courier?: {
    /** Courier id from services/couriers (older orders only have "steadfast"). */
    provider: string;
    /** Name shown to customers; needed for the manual courier. */
    name?: string;
    consignmentId: string | number;
    trackingCode: string;
    status: string;
    sentAt: string;
    mock?: boolean;
  };
  history: OrderEvent[];
  createdAt: string;
};

export type Review = {
  id: string;
  productId: string;
  userId: string;
  userName: string;
  orderId: string;
  rating: number;
  comment: string;
  images: string[];
  hidden: boolean;
  createdAt: string;
};

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

export type NotificationLog = {
  id: string;
  channel: "sms" | "email";
  to: string;
  message: string;
  ok: boolean;
  detail: string;
  at: string;
};

export type ResetToken = { userId: string; expiresAt: number };
