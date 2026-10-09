import { randomUUID } from "node:crypto";
import type { Response } from "express";
import pg from "pg";
import { pool } from "../db/pool.js";

/**
 * Live order tracking that works with any number of API servers.
 *
 * A customer's browser keeps a stream open to ONE server. The order may be changed on ANOTHER
 * server (an admin clicks "Shipped", the courier sync runs, a payment arrives). So every change is
 * also announced through PostgreSQL (NOTIFY), and every server LISTENs, loads the fresh order and
 * pushes it to the browsers connected to it. No extra software (Redis) is needed.
 */

const CHANNEL = "rivowear_order_updates";
const INSTANCE_ID = randomUUID();
const MAX_VIEWERS_PER_ORDER = 25;

type Loader = (trackingId: string) => Promise<unknown | undefined>;
let loadTracking: Loader | null = null;

const clients = new Map<string, Set<Response>>();
const quiet = (label: string) => (error: unknown) => console.error(`[realtime] ${label}:`, error instanceof Error ? error.message : error);

/** Opens the event stream. Returns false (and writes nothing) when this order already has too many viewers on this server. */
export const subscribe = (trackingId: string, response: Response): boolean => {
  const existing = clients.get(trackingId);
  if (existing && existing.size >= MAX_VIEWERS_PER_ORDER) return false;

  response.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no",
  });
  response.write("retry: 5000\n\n");
  const set = existing ?? new Set<Response>();
  set.add(response);
  clients.set(trackingId, set);

  const heartbeat = setInterval(() => {
    if (!response.writableEnded) response.write(": ping\n\n");
  }, 25_000);
  response.on("close", () => {
    clearInterval(heartbeat);
    set.delete(response);
    if (set.size === 0 && clients.get(trackingId) === set) clients.delete(trackingId);
  });
  return true;
};

const send = (viewers: Set<Response>, payload: unknown) => {
  const frame = `data: ${JSON.stringify(payload)}\n\n`;
  for (const viewer of viewers) if (!viewer.writableEnded) viewer.write(frame);
};

/** Pushes the order to the browsers connected to THIS server (does nothing, and reads nothing, if there are none). */
const deliverLocally = async (trackingId: string, payload?: unknown) => {
  const viewers = clients.get(trackingId);
  if (!viewers?.size) return;
  const data = payload ?? (loadTracking ? await loadTracking(trackingId) : undefined);
  if (data) send(viewers, data);
};

/**
 * Call after an order change is saved. Browsers on this server hear it at once; browsers on other
 * servers hear it through PostgreSQL. Never throws: a failed push must not fail the admin's action.
 */
export const publish = async (trackingId: string, payload?: unknown): Promise<void> => {
  await deliverLocally(trackingId, payload).catch(quiet("local delivery failed"));
  await pool
    .query("SELECT pg_notify($1, $2)", [CHANNEL, JSON.stringify({ t: trackingId, from: INSTANCE_ID })])
    .catch(quiet("could not notify the other servers"));
};

/* ----------------------- The connection that LISTENs ----------------------- */

let listener: pg.Client | null = null;
let retryTimer: NodeJS.Timeout | null = null;
let stopping = false;

const listenUrl = () => process.env.LISTEN_DATABASE_URL ?? process.env.DATABASE_URL ?? "postgres://postgres:postgres@localhost:5432/rivowear";

const connectListener = async (attempt = 0): Promise<void> => {
  if (stopping) return;
  const client = new pg.Client({ connectionString: listenUrl(), keepAlive: true });
  let connected = false;
  let handled = false;

  const lost = (error?: unknown) => {
    if (handled) return;
    handled = true;
    if (listener === client) listener = null;
    client.removeAllListeners();
    client.on("error", () => undefined);
    void client.end().catch(() => undefined);
    if (stopping) return;
    const next = connected ? 0 : attempt + 1;
    const delay = Math.min(30_000, 1_000 * 2 ** next);
    console.error(`[realtime] listener lost (${error instanceof Error ? error.message : "connection closed"}); retrying in ${delay / 1000}s`);
    retryTimer = setTimeout(() => void connectListener(next), delay);
  };

  client.on("error", lost);
  client.on("end", () => lost());
  client.on("notification", (message) => {
    if (message.channel !== CHANNEL || !message.payload) return;
    try {
      const { t, from } = JSON.parse(message.payload) as { t?: unknown; from?: unknown };
      // Changes made on this very server were already delivered directly.
      if (typeof t === "string" && from !== INSTANCE_ID) void deliverLocally(t).catch(quiet("delivery failed"));
    } catch {
      /* ignore a message we cannot read */
    }
  });

  try {
    await client.connect();
    await client.query(`LISTEN ${CHANNEL}`);
    connected = true;
    listener = client;
    if (attempt > 0 || clients.size > 0) {
      // We may have missed changes while disconnected: refresh everyone who is watching right now.
      for (const trackingId of clients.keys()) void deliverLocally(trackingId).catch(quiet("refresh failed"));
    }
    console.log("[realtime] listening for order updates from other servers");
  } catch (error) {
    lost(error);
  }
};

/** Starts listening. `loader` returns the public tracking data for an order, or undefined if it does not exist. */
export const startRealtime = (loader: Loader) => {
  loadTracking = loader;
  stopping = false;
  void connectListener();
};

/** Closes every open stream and the LISTEN connection, so a shutdown (or rolling deploy) is not held up by them. */
export const stopRealtime = async () => {
  stopping = true;
  if (retryTimer) clearTimeout(retryTimer);
  for (const viewers of clients.values()) for (const viewer of viewers) viewer.end();
  clients.clear();
  const current = listener;
  listener = null;
  if (current) {
    current.removeAllListeners();
    current.on("error", () => undefined);
    await current.end().catch(() => undefined);
  }
};

export const realtimeStatus = () => ({ listening: listener !== null, viewers: [...clients.values()].reduce((sum, set) => sum + set.size, 0) });
export const instanceId = INSTANCE_ID;
