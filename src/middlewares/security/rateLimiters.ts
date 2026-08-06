import rateLimit, { RateLimitRequestHandler } from "express-rate-limit";

/**
 * Security rate limiters — IP-aware via `app.set("trust proxy", 1)`.
 * Exported as named instances so tests can isolate state via `resetKey(ip)`.
 *
 * Design decisions (see design.md):
 * - MemoryStore (default) — single-instance deploy; migrate to rate-limit-redis
 *   before scaling horizontally.
 * - standardHeaders: true / legacyHeaders: false (RFC draft RateLimit-* headers).
 */

/** Global cap: 300 requests / minute / IP on all routes (DoS protection). */
export const globalLimiter: RateLimitRequestHandler = rateLimit({
  windowMs: 60_000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
});

/** Sign-in: 5 FAILED attempts / 15 minutes / IP; successes never count. */
export const signInLimiter: RateLimitRequestHandler = rateLimit({
  windowMs: 15 * 60_000,
  max: 5,
  skipSuccessfulRequests: true,
  standardHeaders: true,
  legacyHeaders: false,
});

/** Sign-up: 10 requests / hour / IP (every request counts). */
export const signUpLimiter: RateLimitRequestHandler = rateLimit({
  windowMs: 60 * 60_000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
});
