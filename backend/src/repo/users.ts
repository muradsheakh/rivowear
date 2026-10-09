import { one, rows, type Db, pool } from "../db/pool.js";
import { normalizePhone } from "../lib/util.js";
import type { User } from "../types.js";

const toUser = (row: any): User => ({
  id: row.id,
  name: row.name,
  contact: row.contact,
  email: row.email ?? null,
  phone: row.phone ?? null,
  role: row.role,
  passwordHash: row.password_hash,
  sessionsValidFrom: row.sessions_valid_from.toISOString(),
  createdAt: row.created_at.toISOString(),
});

export const findUserById = async (id: string) => {
  const row = await one("SELECT * FROM users WHERE id = $1", [id]);
  return row ? toUser(row) : undefined;
};

/** Finds a person by the email or phone they signed up with, or by an email/phone added later in the profile. */
export const findUserByContact = async (contact: string) => {
  const phone = normalizePhone(contact);
  const row = await one(
    "SELECT * FROM users WHERE lower(contact) = lower($1) OR lower(email) = lower($1) OR ($2::text IS NOT NULL AND (phone = $2 OR contact = $2)) LIMIT 1",
    [contact.trim(), phone],
  );
  return row ? toUser(row) : undefined;
};

export const createUser = async (name: string, contact: string, passwordHash: string): Promise<User> => {
  const isEmail = contact.includes("@");
  const phone = isEmail ? null : normalizePhone(contact);
  return toUser(
    (await one(
      "INSERT INTO users (name, contact, email, phone, password_hash) VALUES ($1, $2, $3, $4, $5) RETURNING *",
      [name, (phone ?? contact).toLowerCase(), isEmail ? contact.toLowerCase() : null, phone, passwordHash],
    ))!,
  );
};

export const updateProfile = async (id: string, data: { name: string; email: string | null; phone: string | null }): Promise<User> =>
  toUser((await one("UPDATE users SET name = $2, email = $3, phone = $4 WHERE id = $1 RETURNING *", [id, data.name, data.email, data.phone]))!);

/** Ends every login made before now. */
export const invalidateSessions = async (id: string) => {
  await pool.query("UPDATE users SET sessions_valid_from = $2 WHERE id = $1", [id, new Date()]);
};

export const deleteUser = async (id: string) => {
  await pool.query("DELETE FROM users WHERE id = $1", [id]);
};

export const setPassword = async (id: string, passwordHash: string) => {
  // A new password also ends every older login.
  await pool.query("UPDATE users SET password_hash = $2, sessions_valid_from = $3 WHERE id = $1", [id, passwordHash, new Date()]);
};

export const adminExists = async (db: Db = pool) => Boolean(await one("SELECT 1 FROM users WHERE role = 'admin' LIMIT 1", [], db));

export const insertAdmin = async (contact: string, passwordHash: string, db: Db = pool) => {
  await db.query(
    "INSERT INTO users (name, contact, email, role, password_hash) VALUES ('Admin User', $1, $2, 'admin', $3) ON CONFLICT DO NOTHING",
    [contact.toLowerCase(), contact.includes("@") ? contact.toLowerCase() : null, passwordHash],
  );
};

export const listCustomers = async () => {
  const registered = await rows(`
    SELECT u.id, u.name, u.contact, u.created_at,
           COUNT(o.id) FILTER (WHERE o.status NOT IN ('Cancelled','Returned')) AS orders,
           COALESCE(SUM(o.total) FILTER (WHERE o.status NOT IN ('Cancelled','Returned')), 0) AS spent
    FROM users u LEFT JOIN orders o ON o.user_id = u.id
    WHERE u.role = 'customer' GROUP BY u.id ORDER BY u.created_at DESC`);
  const guests = await rows(`
    SELECT shipping->>'phone' AS contact, (array_agg(shipping->>'fullName' ORDER BY created_at DESC))[1] AS name,
           MIN(created_at) AS created_at, COUNT(*) AS orders, COALESCE(SUM(total), 0) AS spent
    FROM orders WHERE user_id IS NULL AND status NOT IN ('Cancelled','Returned')
    GROUP BY shipping->>'phone' ORDER BY MIN(created_at) DESC`);
  return [
    ...registered.map((row) => ({ id: row.id, name: row.name, contact: row.contact, registered: true, createdAt: row.created_at.toISOString(), orders: row.orders, spent: Math.round(row.spent) })),
    ...guests.map((row) => ({ id: row.contact, name: row.name, contact: row.contact, registered: false, createdAt: row.created_at.toISOString(), orders: row.orders, spent: Math.round(row.spent) })),
  ];
};
