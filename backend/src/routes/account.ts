import { Router } from "express";
import { z } from "zod";
import { publicTracking } from "../lib/orders.js";
import { normalizePhone } from "../lib/util.js";
import { firstIssue, passwordSchema, publicUser } from "../lib/validation.js";
import { auth, currentUser, param, rateLimit } from "../middleware.js";
import { addAddress, countAddresses, deleteAddress, listAddresses, setDefaultAddress, updateAddress } from "../repo/addresses.js";
import { myReviews, updateOwnReview, deleteOwnReview } from "../repo/misc.js";
import { accountStats, claimGuestOrder } from "../repo/orders.js";
import { deleteUser, findUserById, invalidateSessions, setPassword, updateProfile } from "../repo/users.js";
import { hashPassword, signToken, verifyPassword } from "../security.js";

const router = Router();
router.use(auth);

const MAX_ADDRESSES = 10;

router.get("/", async (_request, response) => {
  const user = currentUser(response);
  response.json({ user: publicUser(user), stats: await accountStats(user.id) });
});

/* ------------------------------- Profile ------------------------------- */

const profileSchema = z.object({
  name: z.string().trim().min(2, "Please enter your name.").max(80),
  email: z.union([z.literal(""), z.string().trim().email("Please enter a valid email address.")]),
  phone: z.string().trim(),
});

router.patch("/", async (request, response) => {
  const parsed = profileSchema.safeParse(request.body);
  if (!parsed.success) {
    response.status(400).json({ message: firstIssue(parsed.error) });
    return;
  }
  const phone = parsed.data.phone ? normalizePhone(parsed.data.phone) : null;
  if (parsed.data.phone && !phone) {
    response.status(400).json({ message: "Please enter a valid Bangladeshi mobile number (01XXXXXXXXX)." });
    return;
  }
  const email = parsed.data.email ? parsed.data.email.toLowerCase() : null;
  if (!email && !phone) {
    response.status(400).json({ message: "Keep at least an email address or a mobile number on your account." });
    return;
  }
  try {
    const user = await updateProfile(currentUser(response).id, { name: parsed.data.name, email, phone });
    response.json({ user: publicUser(user) });
  } catch (error) {
    const e = error as { code?: string; constraint?: string };
    if (e.code === "23505") {
      response.status(409).json({ message: e.constraint === "users_phone_idx" ? "This mobile number is already used by another account." : "This email is already used by another account." });
      return;
    }
    throw error;
  }
});

/* ------------------------------- Security ------------------------------ */

// Limited per signed-in account as well as per IP, so a stolen login token cannot be used to guess the password from many addresses.
const perUser = (name: string) => rateLimit(10, 15 * 60_000, { name, by: (_request, response) => `user:${currentUser(response).id}` });

router.post("/password", rateLimit(10, 15 * 60_000), perUser("account/password:user"), async (request, response) => {
  const parsed = z.object({ currentPassword: z.string().min(1, "Enter your current password."), newPassword: passwordSchema }).safeParse(request.body);
  if (!parsed.success) {
    response.status(400).json({ message: firstIssue(parsed.error) });
    return;
  }
  const user = currentUser(response);
  if (!(await verifyPassword(parsed.data.currentPassword, user.passwordHash))) {
    response.status(400).json({ message: "Your current password is not correct." });
    return;
  }
  await setPassword(user.id, await hashPassword(parsed.data.newPassword)); // also ends every older login
  response.json({ token: signToken(user.id), message: "Password changed. You were logged out of your other devices." });
});

router.post("/logout-all", async (_request, response) => {
  const user = currentUser(response);
  await invalidateSessions(user.id);
  response.json({ token: signToken(user.id), message: "You were logged out of all other devices." });
});

router.delete("/", rateLimit(10, 15 * 60_000), perUser("account/delete:user"), async (request, response) => {
  const parsed = z.object({ password: z.string().min(1) }).safeParse(request.body);
  const user = currentUser(response);
  if (!parsed.success || !(await verifyPassword(parsed.data.password, user.passwordHash))) {
    response.status(400).json({ message: "Your password is not correct." });
    return;
  }
  if (user.role === "admin") {
    response.status(403).json({ message: "Admin accounts cannot be deleted here." });
    return;
  }
  // Past orders stay in the shop's records (needed for accounting) but are no longer linked to this person.
  await deleteUser(user.id);
  response.status(204).send();
});

/* ------------------------------- Addresses ----------------------------- */

const addressSchema = z.object({
  label: z.string().trim().min(1).max(30).default("Home"),
  fullName: z.string().trim().min(2, "Please enter the receiver's name.").max(80),
  phone: z.string().trim().min(1, "Please enter a phone number."),
  address: z.string().trim().min(5, "Please enter the full address.").max(200),
  city: z.string().trim().min(2, "Please enter the city.").max(80),
  postalCode: z.string().trim().max(20).default(""),
  isDefault: z.boolean().optional(),
});

const readAddress = (body: unknown) => {
  const parsed = addressSchema.safeParse(body);
  if (!parsed.success) return { error: firstIssue(parsed.error) } as const;
  const phone = normalizePhone(parsed.data.phone);
  if (!phone) return { error: "Please enter a valid Bangladeshi mobile number (01XXXXXXXXX)." } as const;
  return { data: { ...parsed.data, phone } } as const;
};

router.get("/addresses", async (_request, response) => {
  response.json({ addresses: await listAddresses(currentUser(response).id) });
});

router.post("/addresses", async (request, response) => {
  const read = readAddress(request.body);
  if ("error" in read) {
    response.status(400).json({ message: read.error });
    return;
  }
  const userId = currentUser(response).id;
  if ((await countAddresses(userId)) >= MAX_ADDRESSES) {
    response.status(409).json({ message: `You can save up to ${MAX_ADDRESSES} addresses. Delete one first.` });
    return;
  }
  response.status(201).json({ address: await addAddress(userId, read.data) });
});

router.patch("/addresses/:id", async (request, response) => {
  const read = readAddress(request.body);
  if ("error" in read) {
    response.status(400).json({ message: read.error });
    return;
  }
  const address = await updateAddress(currentUser(response).id, param(request, "id"), read.data);
  if (!address) {
    response.status(404).json({ message: "Address not found." });
    return;
  }
  response.json({ address });
});

router.post("/addresses/:id/default", async (request, response) => {
  if (!(await setDefaultAddress(currentUser(response).id, param(request, "id")))) {
    response.status(404).json({ message: "Address not found." });
    return;
  }
  response.json({ addresses: await listAddresses(currentUser(response).id) });
});

router.delete("/addresses/:id", async (request, response) => {
  if (!(await deleteAddress(currentUser(response).id, param(request, "id")))) {
    response.status(404).json({ message: "Address not found." });
    return;
  }
  response.json({ addresses: await listAddresses(currentUser(response).id) });
});

/* -------------------------------- Reviews ------------------------------ */

router.get("/reviews", async (_request, response) => {
  response.json({ reviews: await myReviews(currentUser(response).id) });
});

router.patch("/reviews/:id", async (request, response) => {
  const parsed = z
    .object({ rating: z.number().int().min(1).max(5), comment: z.string().trim().min(3, "Please write a short comment.").max(1500) })
    .safeParse(request.body);
  if (!parsed.success) {
    response.status(400).json({ message: firstIssue(parsed.error) });
    return;
  }
  const review = await updateOwnReview(param(request, "id"), currentUser(response).id, parsed.data.rating, parsed.data.comment);
  if (!review) {
    response.status(404).json({ message: "Review not found." });
    return;
  }
  response.json({ review });
});

router.delete("/reviews/:id", async (request, response) => {
  if (!(await deleteOwnReview(param(request, "id"), currentUser(response).id))) {
    response.status(404).json({ message: "Review not found." });
    return;
  }
  response.status(204).send();
});

/* ---------------------------- Link a guest order ----------------------- */

router.post("/claim-order", rateLimit(20, 15 * 60_000), async (request, response) => {
  const parsed = z.object({ trackingId: z.string().trim().min(6).max(20), phone: z.string().trim().min(1) }).safeParse(request.body);
  const phone = parsed.success ? normalizePhone(parsed.data.phone) : null;
  if (!parsed.success || !phone) {
    response.status(400).json({ message: "Enter the tracking ID and the phone number used for the order." });
    return;
  }
  const result = await claimGuestOrder(currentUser(response).id, parsed.data.trackingId, phone);
  if (!result) {
    response.status(404).json({ message: "No order matches this tracking ID and phone number, or it already belongs to another account." });
    return;
  }
  if (result === "owned") {
    response.status(409).json({ message: "This order is already in your account." });
    return;
  }
  response.json({ order: publicTracking(result) });
});

export { findUserById };
export default router;
