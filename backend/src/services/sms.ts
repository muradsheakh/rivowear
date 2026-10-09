import { config } from "../config.js";
import { toIntlPhone } from "../lib/util.js";

export type SendResult = { ok: boolean; detail: string };

/**
 * Sends one SMS. "bulksmsbd" is wired up; use "console" while developing.
 * To use another Bangladeshi provider (SSL Wireless, Alpha SMS, ...) only this function needs to change.
 */
export const sendSms = async (localPhone: string, message: string): Promise<SendResult> => {
  if (config.sms.provider === "bulksmsbd" && config.sms.apiKey) {
    try {
      const url = new URL("http://bulksmsbd.net/api/smsapi");
      url.searchParams.set("api_key", config.sms.apiKey);
      url.searchParams.set("type", "text");
      url.searchParams.set("number", toIntlPhone(localPhone));
      url.searchParams.set("senderid", config.sms.senderId);
      url.searchParams.set("message", message);
      const response = await fetch(url, { signal: AbortSignal.timeout(10_000) });
      const body = await response.text();
      return { ok: response.ok && /"response_code"\s*:\s*202/.test(body), detail: body.slice(0, 200) };
    } catch (error) {
      return { ok: false, detail: error instanceof Error ? error.message : "SMS request failed" };
    }
  }
  console.log(`[sms:console] to ${localPhone}: ${message}`);
  return { ok: true, detail: "console (no SMS provider configured)" };
};
