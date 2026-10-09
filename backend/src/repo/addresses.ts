import { one, rows, tx } from "../db/pool.js";
import type { Address } from "../types.js";

const toAddress = (row: any): Address => ({
  id: row.id,
  label: row.label,
  fullName: row.full_name,
  phone: row.phone,
  address: row.address,
  city: row.city,
  postalCode: row.postal_code,
  isDefault: row.is_default,
});

export type AddressInput = Omit<Address, "id" | "isDefault"> & { isDefault?: boolean };

export const listAddresses = async (userId: string) =>
  (await rows("SELECT * FROM addresses WHERE user_id = $1 ORDER BY is_default DESC, created_at", [userId])).map(toAddress);

export const countAddresses = async (userId: string) =>
  (await one<{ n: number }>("SELECT COUNT(*) AS n FROM addresses WHERE user_id = $1", [userId]))!.n;

/** The first address a person saves becomes their default. Setting a new default clears the old one. */
export const addAddress = (userId: string, input: AddressInput): Promise<Address> =>
  tx(async (client) => {
    const existing = (await one<{ n: number }>("SELECT COUNT(*) AS n FROM addresses WHERE user_id = $1", [userId], client))!.n;
    const makeDefault = input.isDefault || existing === 0;
    if (makeDefault) await client.query("UPDATE addresses SET is_default = false WHERE user_id = $1", [userId]);
    return toAddress(
      (await one(
        "INSERT INTO addresses (user_id, label, full_name, phone, address, city, postal_code, is_default) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *",
        [userId, input.label, input.fullName, input.phone, input.address, input.city, input.postalCode, makeDefault],
        client,
      ))!,
    );
  });

export const updateAddress = (userId: string, id: string, input: AddressInput): Promise<Address | undefined> =>
  tx(async (client) => {
    if (input.isDefault) await client.query("UPDATE addresses SET is_default = false WHERE user_id = $1 AND id <> $2", [userId, id]);
    const row = await one(
      `UPDATE addresses SET label=$3, full_name=$4, phone=$5, address=$6, city=$7, postal_code=$8, is_default = is_default OR $9
       WHERE id = $1 AND user_id = $2 RETURNING *`,
      [id, userId, input.label, input.fullName, input.phone, input.address, input.city, input.postalCode, Boolean(input.isDefault)],
      client,
    );
    return row ? toAddress(row) : undefined;
  });

export const setDefaultAddress = (userId: string, id: string): Promise<boolean> =>
  tx(async (client) => {
    const owned = await one("SELECT 1 FROM addresses WHERE id = $1 AND user_id = $2", [id, userId], client);
    if (!owned) return false;
    await client.query("UPDATE addresses SET is_default = false WHERE user_id = $1", [userId]);
    await client.query("UPDATE addresses SET is_default = true WHERE id = $1", [id]);
    return true;
  });

export const deleteAddress = (userId: string, id: string): Promise<boolean> =>
  tx(async (client) => {
    const removed = await client.query("DELETE FROM addresses WHERE id = $1 AND user_id = $2 RETURNING is_default", [id, userId]);
    if (removed.rowCount !== 1) return false;
    // If the default was removed, the oldest remaining address takes over.
    if (removed.rows[0].is_default) {
      await client.query(
        "UPDATE addresses SET is_default = true WHERE id = (SELECT id FROM addresses WHERE user_id = $1 ORDER BY created_at LIMIT 1)",
        [userId],
      );
    }
    return true;
  });
