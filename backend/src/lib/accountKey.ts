import type { Request } from "express";
import { normalizePhone } from "./util.js";

/**
 * One stable name for an account, however the person typed it: 01712345678, +8801712345678 and
 * 8801712345678 are the same phone, and emails ignore capital letters. Used for per-account limits.
 */
export const accountKey = (contact: string): string => {
  const text = contact.trim();
  return normalizePhone(text) ?? text.toLowerCase();
};

/** For rateLimit({ by }): counts by the account named in the request body, not by IP address. */
export const byAccount = (request: Request): string | undefined => {
  const contact = (request.body as { contact?: unknown } | undefined)?.contact;
  return typeof contact === "string" && contact.trim() ? `account:${accountKey(contact)}` : undefined;
};

export const loginFailKey = (contact: string) => `auth/login:account|account:${accountKey(contact)}`;

/** For rateLimit({ by }): counts by the phone number in the request body. Falls back to the IP when there is no valid number. */
export const byPhone = (request: Request): string | undefined => {
  const phone = (request.body as { phone?: unknown } | undefined)?.phone;
  const normalized = typeof phone === "string" ? normalizePhone(phone.trim()) : null;
  return normalized ? `phone:${normalized}` : undefined;
};
