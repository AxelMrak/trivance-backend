import { getTestAgent } from "@test/setup";
import { signInLimiter } from "@middlewares/security/rateLimiters";

/**
 * T-006 — Auth Sign-in Rate Limit (integration)
 * The real /auth/sign-in chain (validation + AuthController) must stop
 * answering once the sign-in limiter threshold (5 failed / 15 min / IP) is
 * exceeded.
 *
 * Spec scenarios: Failed sign-in attempts get rate-limited.
 *
 * The first 5 attempts fail authentication (non-2xx — 401 on a usable users
 * table, 500 when the DB is unavailable); the limiter treats any non-2xx as a
 * failed attempt and the 6th request MUST be blocked with 429.
 */
describe("POST /auth/sign-in rate limit #security-middleware #integration", () => {
  const IP = "::ffff:127.0.0.1";

  beforeEach(() => {
    // In-memory store is per-process: isolate each case from the previous counts.
    signInLimiter.resetKey(IP);
  });

  it("5 failed attempts, then the 6th • gets 429 Too Many Requests", async () => {
    // Consume 5 auth failures (JSON accepted → controller → non-2xx)
    for (let i = 0; i < 5; i += 1) {
      const res = await getTestAgent()
        .post("/auth/sign-in")
        .send({ email: "nonexistent@example.com", password: "wrongpassword123" });
      // a failed attempt: 4xx/5xx, never a successful 2xx — and never blocked yet
      expect(res.status).toBeGreaterThanOrEqual(400);
      expect(res.status).not.toBe(429);
    }

    // The 6th failed attempt exceeds the 5-failure window → 429
    const blocked = await getTestAgent()
      .post("/auth/sign-in")
      .send({ email: "nonexistent@example.com", password: "wrongpassword123" });
    expect(blocked.status).toBe(429);
  });
});
