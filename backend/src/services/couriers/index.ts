import { config, steadfastConfigured } from "../../config.js";
import { courierTrackUrl, createParcel as steadfastCreate, getDeliveryStatus, mapCourierStatus } from "../steadfast.js";
import type { CourierAdapter } from "./types.js";

const steadfast: CourierAdapter = {
  id: "steadfast",
  label: "Steadfast",
  // In development the parcel is simulated, so Steadfast stays selectable without keys.
  configured: () => steadfastConfigured() || !config.isProd,
  createParcel: (order) => steadfastCreate(order),
  getStatus: getDeliveryStatus,
  mapStatus: mapCourierStatus,
  trackUrl: courierTrackUrl,
};

/**
 * "Any other courier" with no API connection: you book the parcel on the courier's own website/app or by phone,
 * then type the courier name and the tracking code here. The order becomes Shipped and the customer gets the SMS.
 * There is no automatic status: mark the order Delivered/Returned yourself on the order page.
 */
const manual: CourierAdapter = {
  id: "manual",
  label: "Other courier (manual)",
  manual: true,
  configured: () => true,
  createParcel: async (_order, input) => {
    const trackingCode = input.trackingCode?.trim();
    const courierName = input.courierName?.trim();
    if (!courierName) throw new Error("Type the courier's name (for example Pathao, RedX, Sundarban).");
    if (!trackingCode) throw new Error("Type the courier's tracking / consignment code.");
    return { consignmentId: trackingCode, trackingCode, status: "booked" };
  },
};

/*
 * ---- REGISTER NEW COURIERS HERE ----
 * 1. copy services/couriers/template.ts to e.g. redx.ts and fill it in (OFFLINE SETUP: you need that courier's merchant account + API keys)
 * 2. import it above and add it to this list.
 */
const all: CourierAdapter[] = [steadfast, manual];

export const getCourier = (id: string | undefined): CourierAdapter | undefined => all.find((courier) => courier.id === id);

/** Couriers the admin can pick right now (keys present, or manual). */
export const availableCouriers = () => all.filter((courier) => courier.configured());

/** Used by "bulk send" and as the pre-selected courier. Set DEFAULT_COURIER in .env; manual can never be the default. */
export const defaultCourier = (): CourierAdapter => {
  const wanted = getCourier(config.defaultCourier);
  return wanted && !wanted.manual && wanted.configured() ? wanted : steadfast;
};

export type { CourierAdapter, ParcelInput, ParcelResult } from "./types.js";
