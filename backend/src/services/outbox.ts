import { logNotification } from "../repo/misc.js";
import { claim, enqueue, markDead, markRetry, markSent, purgeOutbox, reviveDead, type OutboxRow } from "../repo/outbox.js";
import { sendEmail } from "./email.js";
import { sendSms, type SendResult } from "./sms.js";

/** Wait before try number 2, 3, 4, 5, 6 (minutes). After the 6th failed try the message is given up as "dead". */
const RETRY_MINUTES = [1, 5, 15, 60, 180];
const MAX_ATTEMPTS = RETRY_MINUTES.length + 1;
/** "Your order shipped" is useless a day later, so old messages are not sent any more. */
const MAX_AGE_MS = 24 * 60 * 60_000;
const BATCH = 10;

const attemptSend = async (row: OutboxRow): Promise<SendResult> => {
  try {
    return row.channel === "sms" ? await sendSms(row.recipient, row.body) : await sendEmail(row.recipient, row.subject ?? "", row.body);
  } catch (error) {
    return { ok: false, detail: error instanceof Error ? error.message : "Send failed" };
  }
};

const deliver = async (row: OutboxRow) => {
  const result = await attemptSend(row);
  // Every try shows up in the admin notification list, so failures are visible.
  await logNotification(row.channel, row.recipient, row.channel === "sms" ? row.body : (row.subject ?? ""), result.ok, row.attempts > 1 ? `try ${row.attempts}: ${result.detail}` : result.detail).catch(() => undefined);
  if (result.ok) {
    await markSent(row.id);
    return;
  }
  const tooOld = Date.now() - row.createdAt.getTime() > MAX_AGE_MS;
  if (row.attempts >= MAX_ATTEMPTS || tooOld) {
    await markDead(row.id, result.detail);
    console.error(`[outbox] giving up on ${row.channel} to ${row.recipient} after ${row.attempts} tries: ${result.detail}`);
    return;
  }
  await markRetry(row.id, result.detail, (RETRY_MINUTES[row.attempts - 1] ?? 180) * 60);
};

const sendNow = async (id: string) => {
  const [row] = await claim(1, id);
  if (row) await deliver(row);
};

/**
 * Saves the message, then tries to send it right away in the background. The caller never waits for the provider
 * and never sees its failure; if the first try fails, the retry job picks the message up.
 * Never throws: a failed notification must not break placing an order.
 */
const queue = async (channel: "sms" | "email", recipient: string, body: string, subject?: string) => {
  try {
    const id = await enqueue(channel, recipient, body, subject);
    void sendNow(id).catch((error) => console.error("[outbox] first try failed to run:", error instanceof Error ? error.message : error));
  } catch (error) {
    console.error(`[outbox] could not save ${channel} for ${recipient}:`, error instanceof Error ? error.message : error);
  }
};

export const queueSms = (to: string, message: string) => queue("sms", to, message);
export const queueEmail = (to: string, subject: string, html: string) => queue("email", to, html, subject);

/** Retry job: sends everything that is due. Run on one server at a time (see runExclusive in server.ts). */
export const processOutbox = async () => {
  for (;;) {
    const batch = await claim(BATCH);
    if (batch.length === 0) return;
    await Promise.all(batch.map(deliver));
    if (batch.length < BATCH) return;
  }
};

/** Admin pressed "Retry" on a dead message: give it a fresh start and try right away. */
export const retryDeadMessage = async (id: string): Promise<boolean> => {
  if (!(await reviveDead(id))) return false;
  void sendNow(id).catch((error) => console.error("[outbox] manual retry failed to run:", error instanceof Error ? error.message : error));
  return true;
};

export { purgeOutbox };
