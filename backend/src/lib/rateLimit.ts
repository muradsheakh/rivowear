import { one, pool } from "../db/pool.js";

export type RateResult = { allowed: boolean; count: number; limit: number; retryAfterSeconds: number };

/**
 * Counts one attempt for `key` in a fixed time window and says whether it is still allowed.
 *
 * The counter lives in PostgreSQL (table rate_limits), not in the memory of one API process, so
 * every API server shares the same numbers and a restart does not give attackers a fresh start.
 * The single INSERT ... ON CONFLICT statement is atomic: two servers hitting the same key at the
 * same moment can never both read the old value.
 */
export const hit = async (key: string, limit: number, windowMs: number): Promise<RateResult> => {
  const row = await one<{ count: number; wait: number }>(
    `INSERT INTO rate_limits AS r (key, count, reset_at)
     VALUES ($1, 1, now() + $2::double precision * interval '1 millisecond')
     ON CONFLICT (key) DO UPDATE SET
       count = CASE WHEN r.reset_at <= now() THEN 1 ELSE r.count + 1 END,
       reset_at = CASE WHEN r.reset_at <= now() THEN now() + $2::double precision * interval '1 millisecond' ELSE r.reset_at END
     RETURNING r.count, GREATEST(1, CEIL(EXTRACT(EPOCH FROM (r.reset_at - now()))))::int AS wait`,
    [key.slice(0, 300), windowMs],
  );
  const count = row?.count ?? 1;
  return { allowed: count <= limit, count, limit, retryAfterSeconds: row?.wait ?? Math.ceil(windowMs / 1000) };
};

/** Forgets the counter for `key` (for example after a successful login). */
export const clearLimit = async (key: string) => {
  await pool.query("DELETE FROM rate_limits WHERE key = $1", [key.slice(0, 300)]);
};

/** Removes counters whose window is over. Safe to run on every server. */
export const purgeRateLimits = async () => {
  await pool.query("DELETE FROM rate_limits WHERE reset_at < now() - interval '1 minute'");
};

export const waitText = (seconds: number) => {
  if (seconds < 90) return `${seconds} seconds`;
  const minutes = Math.ceil(seconds / 60);
  return minutes < 90 ? `${minutes} minutes` : `${Math.ceil(minutes / 60)} hours`;
};
