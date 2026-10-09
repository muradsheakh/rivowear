import { z } from "zod";
import type { User } from "../types.js";

export const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters.")
  .max(128)
  .regex(/[A-Za-z]/, "Password must contain a letter.")
  .regex(/\d/, "Password must contain a number.");

export const firstIssue = (error: z.ZodError) => error.issues[0]?.message ?? "Invalid request.";

export const publicUser = (user: User) => ({
  id: user.id,
  name: user.name,
  contact: user.contact,
  email: user.email,
  phone: user.phone,
  role: user.role,
  createdAt: user.createdAt,
});
