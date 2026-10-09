import { pool } from "../db/pool.js";

/**
 * Runs `job` only if no other API server (or an earlier run of this one) is running the same job.
 * Uses a PostgreSQL advisory lock, which PostgreSQL releases by itself if the server crashes.
 * Returns false when the job was skipped because someone else holds the lock.
 */
export const runExclusive = async (name: string, job: () => Promise<unknown>): Promise<boolean> => {
  const client = await pool.connect();
  let broken = false;
  try {
    const key = `rivowear:job:${name}`;
    const got = (await client.query("SELECT pg_try_advisory_lock(hashtext($1)) AS ok", [key])).rows[0]?.ok === true;
    if (!got) return false;
    try {
      await job();
    } finally {
      // If the unlock fails, throw this connection away so the lock cannot stay behind in the pool.
      await client.query("SELECT pg_advisory_unlock(hashtext($1))", [key]).catch(() => {
        broken = true;
      });
    }
    return true;
  } finally {
    client.release(broken);
  }
};

/** Like runExclusive, but waits for its turn. Used for start-up work that must happen once, such as seeding. */
export const runOnceAcrossServers = async <T>(name: string, job: () => Promise<T>): Promise<T> => {
  const client = await pool.connect();
  let broken = false;
  try {
    const key = `rivowear:startup:${name}`;
    await client.query("SELECT pg_advisory_lock(hashtext($1))", [key]);
    try {
      return await job();
    } finally {
      await client.query("SELECT pg_advisory_unlock(hashtext($1))", [key]).catch(() => {
        broken = true;
      });
    }
  } finally {
    client.release(broken);
  }
};
