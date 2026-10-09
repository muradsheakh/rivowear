import pg from "pg";

// numeric and bigint come back as strings by default; the app wants plain numbers.
pg.types.setTypeParser(1700, (value) => Number(value));
pg.types.setTypeParser(20, (value) => Number(value));

export const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL ?? "postgres://postgres:postgres@localhost:5432/rivowear",
  max: Number(process.env.DB_POOL_SIZE ?? 10),
});

export type Db = Pick<pg.Pool, "query">;
export type Client = pg.PoolClient;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const rows = async <T = any>(text: string, params: unknown[] = [], db: Db = pool): Promise<T[]> =>
  (await db.query(text, params)).rows as T[];

export const one = async <T = any>(text: string, params: unknown[] = [], db: Db = pool): Promise<T | undefined> =>
  (await rows<T>(text, params, db))[0];

/** Runs fn in a database transaction: everything inside succeeds together or not at all. */
export const tx = async <T>(fn: (client: Client) => Promise<T>): Promise<T> => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }
};
