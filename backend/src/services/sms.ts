import { config } from "../config.js";
import { toIntlPhone } from "../lib/util.js";

export type SendResult = { ok: boolean; detail: string };

/**
 * Sends one SMS. "bulksmsbd" and "brevo" are wired up; use "console" while developing.
 * To use another Bangladeshi provider (SSL Wireless, Alpha SMS, ...) only this function needs to change.
 */
export const sendSms = async (localPhone: string, message: string): Promise<SendResult> => {
  if (config.sms.provider === "brevo") {
    if (!config.sms.apiKey || !config.sms.senderId) {
      return { ok: false, detail: "Brevo SMS requires SMS_API_KEY and SMS_SENDER_ID." };
    }
    try {
      const response = await fetch("https://api.brevo.com/v3/transactionalSMS/sms", {
        method: "POST",
        headers: {
          accept: "application/json",
          "api-key": config.sms.apiKey,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          sender: config.sms.senderId,
          recipient: toIntlPhone(localPhone),
          content: message,
          type: "transactional",
          unicodeEnabled: /[^\u0000-\u007f]/.test(message),
          tag: "rivowear-transactional",
        }),
        signal: AbortSignal.timeout(10_000),
      });
      const body = await response.text();
      return {
        ok: response.status === 201,
        detail: response.ok ? body.slice(0, 200) : `Brevo ${response.status}: ${body.slice(0, 160)}`,
      };
    } catch (error) {
      return { ok: false, detail: error instanceof Error ? error.message : "Brevo SMS request failed" };
    }
  }

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

  if (config.sms.provider === "console") {
    console.log(`[sms:console] to ${localPhone}: ${message}`);
    return { ok: true, detail: "console (no SMS provider configured)" };
  }

  if (config.sms.provider === "bulksmsbd") {
    return { ok: false, detail: "BulkSMSBD requires SMS_API_KEY." };
  }

  return { ok: false, detail: `Unsupported SMS_PROVIDER: ${config.sms.provider}` };
};
