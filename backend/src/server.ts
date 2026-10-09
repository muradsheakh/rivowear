import "dotenv/config";
import app from "./app.js";
import { config } from "./config.js";
import { migrate } from "./db/migrate.js";
import { pool } from "./db/pool.js";
import { seedIfEmpty } from "./db/seed.js";
import { syncCourierStatuses } from "./lib/courierSync.js";
import { runExclusive, runOnceAcrossServers } from "./lib/jobs.js";
import { cancelStaleUnpaidOrders } from "./lib/maintenance.js";
import { publicTracking } from "./lib/orders.js";
import { purgeRateLimits } from "./lib/rateLimit.js";
import { purgeOtpCodes } from "./repo/otp.js";
import { processOutbox, purgeOutbox } from "./services/outbox.js";
import { instanceId, startRealtime, stopRealtime } from "./lib/realtime.js";
import { getOrderByTracking } from "./repo/orders.js";

await migrate();
// Several servers may start at the same time; only one seeds, the others wait and find it done.
await runOnceAcrossServers("seed", seedIfEmpty);

// Live tracking: hear about order changes made on any server.
startRealtime(async (trackingId) => {
  const order = await getOrderByTracking(trackingId);
  return order ? publicTracking(order) : undefined;
});

const server = app.listen(config.port, () => {
  console.log(`Rivowear API listening on http://localhost:${config.port} (instance ${instanceId.slice(0, 8)})`);
});

// Each job runs on ONE server at a time, even when many servers are running.
const every = (minutes: number, job: () => Promise<unknown>, name: string) =>
  setInterval(() => void runExclusive(name, job).catch((error) => console.error(`[${name}] failed:`, error)), minutes * 60_000);

// Keep order statuses in step with Steadfast, free stock held by unpaid online orders, and clear old rate-limit counters.
// With the Steadfast webhook on, the poll is only a safety net (a missed webhook is fixed within the hour).
every(config.steadfast.webhookToken ? 60 : 10, syncCourierStatuses, "courier");
every(15, cancelStaleUnpaidOrders, "maintenance");
every(10, purgeRateLimits, "rate-limit-cleanup");
every(60, purgeOtpCodes, "otp-cleanup");
// Resend SMS/emails that failed (provider down, bad network). Checked every minute; waits grow 1 > 5 > 15 > 60 > 180 minutes.
every(1, processOutbox, "outbox");
every(60, purgeOutbox, "outbox-cleanup");

let closing = false;
const shutdown = () => {
  if (closing) return;
  closing = true;
  setTimeout(() => process.exit(1), 10_000).unref();
  // Open live-tracking streams would keep the server from closing, so end them first (browsers reconnect to another server).
  void stopRealtime().then(() => server.close(() => void pool.end().then(() => process.exit(0))));
};
process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
