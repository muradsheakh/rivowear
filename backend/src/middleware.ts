import type { NextFunction, Request, Response } from "express";
import { hit, waitText } from "./lib/rateLimit.js";
import { findUserById } from "./repo/users.js";
import { verifyToken } from "./security.js";
import type { User } from "./types.js";

export const param = (request: Request, name: string): string => {
  const value = request.params[name];
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
};

export const currentUser = (response: Response) => response.locals.user as User;

const userFromRequest = async (request: Request): Promise<User | undefined> => {
  const token = request.header("authorization")?.replace(/^Bearer\s+/i, "");
  const verified = token ? verifyToken(token) : null;
  if (!verified) return undefined;
  const user = await findUserById(verified.userId);
  // "Log out of all devices" and password changes cancel every login made before them.
  if (!user || verified.issuedAt < new Date(user.sessionsValidFrom).getTime()) return undefined;
  return user;
};

export const auth = async (request: Request, response: Response, next: NextFunction) => {
  const user = await userFromRequest(request);
  if (!user) {
    response.status(401).json({ message: "Authentication required." });
    return;
  }
  response.locals.user = user;
  next();
};

/** Attaches the user when a valid token is sent, but lets guests through. */
export const optionalAuth = async (request: Request, response: Response, next: NextFunction) => {
  const user = await userFromRequest(request);
  if (user) response.locals.user = user;
  next();
};

export const adminOnly = (_request: Request, response: Response, next: NextFunction) => {
  if (currentUser(response).role !== "admin") {
    response.status(403).json({ message: "Admin access required." });
    return;
  }
  next();
};

type RateLimitOptions = {
  /** Counter name. Defaults to the route, so every route has its own limit. */
  name?: string;
  /** What to count by. Defaults to the visitor's IP address. Use it to limit per phone number or per account. */
  by?: (request: Request, response: Response) => string | undefined;
};

/**
 * Allows `limit` requests per `windowMs` from the same visitor to this route.
 * Counted in PostgreSQL, so the limit is shared by all API servers and survives restarts.
 */
export const rateLimit = (limit: number, windowMs: number, options: RateLimitOptions = {}) =>
  async (request: Request, response: Response, next: NextFunction) => {
    // The route pattern (/track/:trackingId), not the real URL, so one visitor cannot make endless fresh counters.
    const route = options.name ?? `${request.baseUrl}${request.route?.path ?? request.path}`;
    const who = options.by?.(request, response) ?? request.ip ?? "unknown";
    try {
      const result = await hit(`${route}|${who}`, limit, windowMs);
      response.setHeader("RateLimit-Limit", String(limit));
      response.setHeader("RateLimit-Remaining", String(Math.max(0, limit - result.count)));
      if (!result.allowed) {
        response.setHeader("Retry-After", String(result.retryAfterSeconds));
        response.status(429).json({ message: `Too many attempts. Please try again in ${waitText(result.retryAfterSeconds)}.` });
        return;
      }
    } catch (error) {
      // If the counter table cannot be reached, keep the shop working rather than blocking every customer.
      console.error("[rate-limit] could not check the limit, letting the request through:", error instanceof Error ? error.message : error);
    }
    next();
  };
