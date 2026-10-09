import type { Order, OrderStatus } from "../../types.js";

export type ParcelResult = { consignmentId: string | number; trackingCode: string; status: string; mock?: boolean };

/** What the admin typed when the courier has no API (only used by the "manual" courier). */
export type ParcelInput = { courierName?: string; trackingCode?: string };

/**
 * One delivery company. To add a new courier: copy `template.ts`, fill it in, and register it in `index.ts`
 * (two lines). Nothing else in the shop needs to change.
 */
export type CourierAdapter = {
  /** Short id saved on every order (never change it later): "steadfast", "redx", ... */
  id: string;
  /** Name shown to you and to customers. */
  label: string;
  /** true when the API keys are in .env. */
  configured: () => boolean;
  /** Creates the parcel at the courier. Throw an Error with a readable message when the courier rejects it. */
  createParcel: (order: Order, input: ParcelInput) => Promise<ParcelResult>;
  /** Asks the courier for the parcel's current status. Leave out if the courier has no status API (no polling then). */
  getStatus?: (consignmentId: string | number) => Promise<string | null>;
  /** Courier status word -> our order status. Return null to leave the order status alone. */
  mapStatus?: (courierStatus: string) => OrderStatus | null;
  /** Public tracking page of the courier (shown to the customer). */
  trackUrl?: (trackingCode: string) => string | null;
  /** true = the admin must type a courier name and tracking code (no API). */
  manual?: boolean;
};
