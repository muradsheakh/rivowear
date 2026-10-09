import { createHmac, randomBytes, randomInt, scrypt, timingSafeEqual } from "node:crypto";

const secret =
  process.env.JWT_SECRET ??
  (() => {
    // Every API server must use the SAME secret, otherwise a login made on one server is rejected by the next.
    if (process.env.NODE_ENV === "production") throw new Error("JWT_SECRET must be set in production (the same value on every server).");
    console.warn("[security] JWT_SECRET is not set. Using a random secret; sessions reset on restart.");
    return randomBytes(32).toString("hex");
  })();

// Same parameters as the old scryptSync (N=16384, r=8, p=1), so passwords already in the database keep working.
// The async version runs on Node's thread pool, so a burst of logins no longer freezes every other request.
const scryptAsync = (password: string, salt: Buffer, length: number) =>
  new Promise<Buffer>((resolve, reject) => scrypt(password, salt, length, (error, key) => (error ? reject(error) : resolve(key))));

export const hashPassword = async (password: string): Promise<string> => {
  const salt = randomBytes(16);
  const hash = await scryptAsync(password, salt, 64);
  return `${salt.toString("hex")}:${hash.toString("hex")}`;
};

export const verifyPassword = async (password: string, stored: string): Promise<boolean> => {
  const [saltHex, hashHex] = stored.split(":");
  if (!saltHex || !hashHex) return false;
  const expected = Buffer.from(hashHex, "hex");
  const actual = await scryptAsync(password, Buffer.from(saltHex, "hex"), expected.length);
  return timingSafeEqual(expected, actual);
};

const DUMMY_SALT = randomBytes(16);
/** Does the same amount of work as a real check, so "no such account" takes as long as "wrong password". */
export const burnPasswordCheck = async (password: string): Promise<void> => {
  await scryptAsync(password, DUMMY_SALT, 64);
};

/** A 6-digit one-time code. randomInt is cryptographically secure and has no modulo bias. */
export const generateOtp = (): string => String(randomInt(0, 1_000_000)).padStart(6, "0");

/**
 * What is stored for a code instead of the code itself. A 6-digit code has only a million possibilities, so a plain
 * SHA-256 could be reversed in a blink if the database leaked. Mixing in the server secret (HMAC) means a leaked
 * database alone is not enough. The purpose and target are mixed in too, so a code is useless anywhere else.
 */
export const otpDigest = (purpose: string, target: string, code: string): string =>
  createHmac("sha256", secret).update(`otp|${purpose}|${target}|${code}`).digest("hex");

export const safeEqualHex = (a: string, b: string): boolean => {
  const left = Buffer.from(a, "hex");
  const right = Buffer.from(b, "hex");
  return left.length === right.length && timingSafeEqual(left, right);
};

const b64 = (input: string | Buffer) => Buffer.from(input).toString("base64url");
const sign = (data: string) => createHmac("sha256", secret).update(data).digest("base64url");

export const signToken = (userId: string, ttlSeconds = 60 * 60 * 24 * 7): string => {
  const header = b64(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const now = Math.floor(Date.now() / 1000);
  // "at" is the exact moment (milliseconds) the login was made, so "log out of all devices" is precise.
  const payload = b64(JSON.stringify({ sub: userId, iat: now, at: Date.now(), exp: now + ttlSeconds }));
  return `${header}.${payload}.${sign(`${header}.${payload}`)}`;
};

export const verifyToken = (token: string): { userId: string; issuedAt: number } | null => {
  const [header, payload, signature] = token.split(".");
  if (!header || !payload || !signature) return null;
  const expected = Buffer.from(sign(`${header}.${payload}`));
  const actual = Buffer.from(signature);
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString()) as { sub?: string; iat?: number; at?: number; exp?: number };
    if (!data.sub || !data.exp || data.exp < Math.floor(Date.now() / 1000)) return null;
    return { userId: data.sub, issuedAt: data.at ?? (data.iat ?? 0) * 1000 };
  } catch {
    return null;
  }
};

/**
 * Proof that a phone number passed the SMS check at checkout. It names the phone and an expiry and is signed with
 * the server secret, so it cannot be forged or reused for a different number. Nothing is stored in the database.
 */
export const signPhoneProof = (phone: string, ttlSeconds = 30 * 60): string => {
  const exp = Math.floor(Date.now() / 1000) + ttlSeconds;
  return `${exp}.${sign(`phone-proof|${phone}|${exp}`)}`;
};

export const verifyPhoneProof = (proof: string, phone: string): boolean => {
  const [expText, signature] = proof.split(".");
  const exp = Number(expText);
  if (!signature || !Number.isFinite(exp) || exp < Math.floor(Date.now() / 1000)) return false;
  const expected = Buffer.from(sign(`phone-proof|${phone}|${exp}`));
  const actual = Buffer.from(signature);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
};
