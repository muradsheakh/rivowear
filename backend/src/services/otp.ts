import { getSettings, logNotification } from "../repo/misc.js";
import { OTP_TTL_MINUTES, type OtpPurpose } from "../repo/otp.js";
import { sendEmail } from "./email.js";
import { sendSms } from "./sms.js";

const LABEL: Record<OtpPurpose, string> = {
  password_reset: "password reset code",
  checkout: "order confirmation code",
};

/**
 * Sends a one-time code by SMS (phone) or email. The code itself is NEVER written to the notification log
 * (that table is shown in the admin panel and kept for 60 days); only the fact that a code was sent.
 */
export const sendOtp = async (purpose: OtpPurpose, destination: { phone?: string | null; email?: string | null }, code: string) => {
  const { storeName } = await getSettings();
  const label = LABEL[purpose];
  const logged = `[${label} sent]`;
  if (destination.phone) {
    const result = await sendSms(destination.phone, `${storeName}: Your ${label} is ${code}. It works for ${OTP_TTL_MINUTES} minutes. Do not share it with anyone.`);
    await logNotification("sms", destination.phone, logged, result.ok, result.detail).catch(() => undefined);
    return result.ok;
  }
  if (destination.email) {
    const html = `<p>Your ${label} is:</p><p style="font-size:28px;letter-spacing:6px;font-weight:bold">${code}</p><p>It works for ${OTP_TTL_MINUTES} minutes. If you did not ask for it, you can ignore this email. Never share this code.</p>`;
    const result = await sendEmail(destination.email, `${storeName}: your ${label}`, html);
    await logNotification("email", destination.email, logged, result.ok, result.detail).catch(() => undefined);
    return result.ok;
  }
  return false;
};
