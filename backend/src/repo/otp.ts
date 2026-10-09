import { one, pool } from "../db/pool.js";
import { generateOtp, otpDigest, safeEqualHex } from "../security.js";

export type OtpPurpose = "password_reset" | "checkout";

export const OTP_TTL_MINUTES = 10;
/** Wrong guesses allowed per code. After this the code is dead and a new one must be requested. */
export const OTP_MAX_ATTEMPTS = 5;
/** A new code cannot be requested sooner than this after the last one. */
export const OTP_RESEND_SECONDS = 60;

/**
 * Creates a fresh code for (purpose, target), replacing any older one, and returns it so it can be sent.
 * Only a keyed hash is stored. Returns null when a code was issued less than OTP_RESEND_SECONDS ago.
 * The cooldown check and the write are one statement, so two quick requests cannot both get through.
 */
export const issueOtp = async (purpose: OtpPurpose, target: string, userId: string | null): Promise<string | null> => {
  const code = generateOtp();
  const row = await one(
    `INSERT INTO otp_codes AS o (purpose, target, user_id, code_hash, expires_at)
     VALUES ($1, $2, $3, $4, now() + $5::double precision * interval '1 minute')
     ON CONFLICT (purpose, target) DO UPDATE SET
       user_id = EXCLUDED.user_id, code_hash = EXCLUDED.code_hash, attempts = 0,
       expires_at = EXCLUDED.expires_at, created_at = now()
     WHERE o.created_at <= now() - $6::double precision * interval '1 second'
     RETURNING o.id`,
    [purpose, target, userId, otpDigest(purpose, target, code), OTP_TTL_MINUTES, OTP_RESEND_SECONDS],
  );
  return row ? code : null;
};

/**
 * Checks a code and uses it up. Every check, right or wrong, counts as an attempt BEFORE the comparison,
 * in the same atomic statement, so parallel guesses cannot beat the attempt limit.
 */
export const verifyOtp = async (purpose: OtpPurpose, target: string, code: string): Promise<{ ok: true; userId: string | null } | { ok: false }> => {
  const row = await one<{ id: string; code_hash: string; user_id: string | null }>(
    `UPDATE otp_codes SET attempts = attempts + 1
     WHERE purpose = $1 AND target = $2 AND expires_at > now() AND attempts < $3
     RETURNING id, code_hash, user_id`,
    [purpose, target, OTP_MAX_ATTEMPTS],
  );
  if (!row || !safeEqualHex(row.code_hash, otpDigest(purpose, target, code))) return { ok: false };
  // DELETE ... RETURNING means a correct code works exactly once, even if it is submitted twice at the same moment.
  const used = await one("DELETE FROM otp_codes WHERE id = $1 RETURNING id", [row.id]);
  return used ? { ok: true, userId: row.user_id } : { ok: false };
};

export const purgeOtpCodes = async () => {
  await pool.query("DELETE FROM otp_codes WHERE expires_at < now() - interval '1 hour'");
};
