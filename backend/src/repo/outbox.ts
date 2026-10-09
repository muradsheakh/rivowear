import { one, pool, rows } from "../db/pool.js";

export type OutboxChannel = "sms" | "email";
export type OutboxRow = { id: string; channel: OutboxChannel; recipient: string; subject: string | null; body: string; attempts: number; createdAt: Date };

/** While a server is sending a message it "owns" it for this long; if that server crashes the message becomes due again. */
const LEASE_SECONDS = 600;

export const enqueue = async (channel: OutboxChannel, recipient: string, body: string, subject?: string): Promise<string> =>
  (await one<{ id: string }>("INSERT INTO outbox (channel, recipient, subject, body) VALUES ($1, $2, $3, $4) RETURNING id", [channel, recipient, subject ?? null, body]))!.id;

/**
 * Takes up to `limit` messages that are due (or just message `id`) and counts one attempt on each.
 * FOR UPDATE SKIP LOCKED + the lease mean two servers never pick the same message.
 */
export const claim = async (limit: number, id?: string): Promise<OutboxRow[]> =>
  (
    await rows(
      `UPDATE outbox SET attempts = attempts + 1, next_attempt_at = now() + $1::double precision * interval '1 second'
       WHERE id IN (
         SELECT id FROM outbox
         WHERE status = 'pending' AND next_attempt_at <= now() AND ($3::text IS NULL OR id = $3)
         ORDER BY next_attempt_at LIMIT $2 FOR UPDATE SKIP LOCKED)
       RETURNING id, channel, recipient, subject, body, attempts, created_at`,
      [LEASE_SECONDS, limit, id ?? null],
    )
  ).map((row) => ({ id: row.id, channel: row.channel, recipient: row.recipient, subject: row.subject, body: row.body, attempts: row.attempts, createdAt: row.created_at }));

export const markSent = async (id: string) => {
  await pool.query("UPDATE outbox SET status = 'sent', sent_at = now(), last_error = '' WHERE id = $1", [id]);
};

export const markRetry = async (id: string, error: string, delaySeconds: number) => {
  await pool.query("UPDATE outbox SET next_attempt_at = now() + $2::double precision * interval '1 second', last_error = $3 WHERE id = $1", [id, delaySeconds, error.slice(0, 300)]);
};

export const markDead = async (id: string, error: string) => {
  await pool.query("UPDATE outbox SET status = 'dead', last_error = $2 WHERE id = $1", [id, error.slice(0, 300)]);
};

/** Messages that gave up. An admin can look at these and decide what to do. */
export const outboxCounts = async () => {
  const row = await one<{ pending: number; dead: number }>(
    "SELECT COUNT(*) FILTER (WHERE status = 'pending') AS pending, COUNT(*) FILTER (WHERE status = 'dead') AS dead FROM outbox",
  );
  return { pending: Number(row?.pending ?? 0), dead: Number(row?.dead ?? 0) };
};

export const purgeOutbox = async () => {
  await pool.query("DELETE FROM outbox WHERE (status = 'sent' AND sent_at < now() - interval '14 days') OR (status = 'dead' AND created_at < now() - interval '60 days')");
};

export type DeadMessage = { id: string; channel: OutboxChannel; recipient: string; subject: string | null; body: string; attempts: number; lastError: string; createdAt: string };

/** Messages that gave up, newest first, for the admin "Failed messages" page. */
export const listDead = async (limit = 100): Promise<DeadMessage[]> =>
  (await rows("SELECT id, channel, recipient, subject, body, attempts, last_error, created_at FROM outbox WHERE status = 'dead' ORDER BY created_at DESC LIMIT $1", [limit])).map((row) => ({
    id: row.id, channel: row.channel, recipient: row.recipient, subject: row.subject, body: row.body, attempts: row.attempts, lastError: row.last_error, createdAt: row.created_at.toISOString(),
  }));

/**
 * Puts a dead message back in the queue with a fresh start (0 attempts, new age) so it gets the full retry schedule again.
 * Returns false when the message is not dead any more (someone else already retried or discarded it).
 */
export const reviveDead = async (id: string): Promise<boolean> =>
  ((await pool.query("UPDATE outbox SET status = 'pending', attempts = 0, next_attempt_at = now(), created_at = now() WHERE id = $1 AND status = 'dead'", [id])).rowCount ?? 0) === 1;

export const discardDead = async (id: string): Promise<boolean> =>
  ((await pool.query("DELETE FROM outbox WHERE id = $1 AND status = 'dead'", [id])).rowCount ?? 0) === 1;
