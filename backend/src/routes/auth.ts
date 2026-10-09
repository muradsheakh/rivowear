import { Router } from "express";
import { z } from "zod";
import { auth, currentUser, rateLimit } from "../middleware.js";
import { issueOtp, verifyOtp } from "../repo/otp.js";
import { createUser, findUserByContact, setPassword } from "../repo/users.js";
import { burnPasswordCheck, hashPassword, signToken, verifyPassword } from "../security.js";
import { sendOtp } from "../services/otp.js";
import { byAccount, loginFailKey } from "../lib/accountKey.js";
import { clearLimit, hit, waitText } from "../lib/rateLimit.js";
import { firstIssue, passwordSchema, publicUser } from "../lib/validation.js";
import { normalizePhone } from "../lib/util.js";

const router = Router();

router.post("/register", rateLimit(20, 15 * 60_000), async (request, response) => {
  const parsed = z
    .object({ name: z.string().trim().min(2).max(80), contact: z.string().trim().min(3).max(120), password: passwordSchema })
    .safeParse(request.body);
  if (!parsed.success) {
    response.status(400).json({ message: firstIssue(parsed.error) });
    return;
  }
  // The sign-up contact must be an email address or a Bangladeshi mobile number.
  const raw = parsed.data.contact;
  const isEmail = raw.includes("@");
  const phone = isEmail ? null : normalizePhone(raw);
  if ((isEmail && !z.string().email().safeParse(raw).success) || (!isEmail && !phone)) {
    response.status(400).json({ message: "Enter a valid email address or a Bangladeshi mobile number (01XXXXXXXXX)." });
    return;
  }
  const contact = phone ?? raw.toLowerCase();
  if (await findUserByContact(contact)) {
    response.status(409).json({ message: "An account already exists for this contact." });
    return;
  }
  try {
    const user = await createUser(parsed.data.name, contact, await hashPassword(parsed.data.password));
    response.status(201).json({ user: publicUser(user) });
  } catch (error) {
    // Two sign-ups with the same contact at the same moment.
    if ((error as { code?: string }).code === "23505") {
      response.status(409).json({ message: "An account already exists for this contact." });
      return;
    }
    throw error;
  }
});

// Failed-login limit per ACCOUNT. The IP limit above stops one machine; this stops many machines (a botnet,
// or leaked-password lists) trying the same account. A correct login resets it. The owner can always still
// use "forgot password", which has its own limit and is not blocked by this one.
const LOGIN_ACCOUNT_LIMIT = 10;
const LOGIN_ACCOUNT_WINDOW_MS = 15 * 60_000;

router.post("/login", rateLimit(20, 15 * 60_000), async (request, response) => {
  const parsed = z.object({ contact: z.string().trim().min(3), password: z.string().min(1) }).safeParse(request.body);
  if (!parsed.success) {
    response.status(400).json({ message: "Contact and password are required." });
    return;
  }
  const { contact, password } = parsed.data;
  // Counted BEFORE the password is checked, in one atomic step, so a flood of parallel guesses cannot slip past the limit.
  try {
    const attempt = await hit(loginFailKey(contact), LOGIN_ACCOUNT_LIMIT, LOGIN_ACCOUNT_WINDOW_MS);
    if (!attempt.allowed) {
      response.setHeader("Retry-After", String(attempt.retryAfterSeconds));
      response.status(429).json({ message: `Too many attempts on this account. Please try again in ${waitText(attempt.retryAfterSeconds)}, or reset your password.` });
      return;
    }
  } catch (error) {
    console.error("[login] could not check the account limit, continuing:", error instanceof Error ? error.message : error);
  }
  const user = await findUserByContact(contact);
  // Unknown account: still do the same amount of work, so response time does not reveal which accounts exist.
  const valid = user ? await verifyPassword(password, user.passwordHash) : (await burnPasswordCheck(password), false);
  if (!user || !valid) {
    response.status(401).json({ message: "Invalid contact or password." });
    return;
  }
  await clearLimit(loginFailKey(contact)).catch(() => undefined);
  response.json({ token: signToken(user.id), user: publicUser(user) });
});

router.post("/logout", auth, (_request, response) => {
  // Tokens are stateless and expire on their own; the client discards its copy.
  response.status(204).send();
});

router.get("/me", auth, (_request, response) => {
  response.json({ user: publicUser(currentUser(response)) });
});

const FORGOT_MESSAGE = "If an account exists, we have sent a 6-digit code. It works for 10 minutes.";

router.post(
  "/forgot-password",
  rateLimit(10, 15 * 60_000),
  // At most 3 codes per account per 15 minutes, so nobody can use us to flood someone's phone with SMS (and our SMS bill).
  rateLimit(3, 15 * 60_000, { name: "auth/forgot-password:account", by: byAccount }),
  async (request, response) => {
    const parsed = z.object({ contact: z.string().trim().min(3) }).safeParse(request.body);
    if (!parsed.success) {
      response.status(400).json({ message: "A valid email or phone number is required." });
      return;
    }
    const raw = parsed.data.contact;
    const user = await findUserByContact(raw);
    if (user) {
      // The code goes to the channel the person typed, so asking by phone never emails a stranger and vice versa.
      const viaEmail = raw.includes("@");
      const destination = viaEmail ? { email: user.email ?? user.contact } : { phone: user.phone ?? normalizePhone(raw) };
      const code = await issueOtp("password_reset", user.id, user.id);
      // Sent in the background and the same answer is always returned, so the reply never shows whether the account exists.
      if (code) void sendOtp("password_reset", destination, code).catch((error) => console.error("[otp] could not send:", error instanceof Error ? error.message : error));
    }
    response.json({ message: FORGOT_MESSAGE });
  },
);

router.post(
  "/reset-password",
  rateLimit(10, 15 * 60_000),
  rateLimit(10, 15 * 60_000, { name: "auth/reset-password:account", by: byAccount }),
  async (request, response) => {
    const parsed = z
      .object({ contact: z.string().trim().min(3), code: z.string().trim().regex(/^\d{6}$/, "Enter the 6-digit code."), password: passwordSchema })
      .safeParse(request.body);
    if (!parsed.success) {
      response.status(400).json({ message: firstIssue(parsed.error) });
      return;
    }
    const user = await findUserByContact(parsed.data.contact);
    // The code is tied to the account it was sent for, and dies after 5 wrong tries or 10 minutes.
    const result = user ? await verifyOtp("password_reset", user.id, parsed.data.code) : { ok: false as const };
    if (!user || !result.ok) {
      response.status(400).json({ message: "This code is wrong or has expired. Please request a new one." });
      return;
    }
    await setPassword(user.id, await hashPassword(parsed.data.password)); // also ends every older login
    await clearLimit(loginFailKey(parsed.data.contact)).catch(() => undefined);
    response.json({ message: "Password updated. You can log in now." });
  },
);

export default router;
