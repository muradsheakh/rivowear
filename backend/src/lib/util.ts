import { randomBytes } from "node:crypto";

const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

export const makeTrackingId = () => {
  const bytes = randomBytes(8);
  return "RW" + [...bytes].map((byte) => ALPHABET[byte % ALPHABET.length]).join("");
};

export const round2 = (value: number) => Math.round(value * 100) / 100;

/** Accepts 01XXXXXXXXX, +8801XXXXXXXXX, 8801XXXXXXXXX. Returns 01XXXXXXXXX or null. */
export const normalizePhone = (input: string): string | null => {
  const digits = input.replace(/[\s()-]/g, "").replace(/^\+/, "");
  const local = digits.startsWith("880") ? digits.slice(2) : digits;
  return /^01[3-9]\d{8}$/.test(local) ? local : null;
};

export const toIntlPhone = (local: string) => `88${local}`;

export const csvCell = (value: unknown) => {
  let text = String(value ?? "");
  // Stop spreadsheet formula injection.
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
};
