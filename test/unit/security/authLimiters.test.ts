import express from "express";
import request from "supertest";

import { signInLimiter, signUpLimiter } from "@middlewares/security/rateLimiters";

/**
 * T-005 — Auth Rate Limiters
 * signInLimiter: 5 failed requests / 15 min per IP, only failed attempts
 *   count (skipSuccessfulRequests: true).
 * signUpLimiter: 10 requests / hour per IP, every request counts.
 *
 * Spec scenarios: Auth failed sign-in attempts get rate-limited;
 *                 Successful sign-in does not count toward the limit;
 *                 Client exceeds sign-up rate limit.
 */
describe("Auth rate limiters #security-middleware", () => {
  const IP = "::ffff:127.0.0.1";

  /** Sign-in stub: always rejects with 401. */
  const buildAlwaysFailSignInApp = () => {
    const app = express();
    app.use("/auth/sign-in", signInLimiter);
    app.post("/auth/sign-in", (_req, res) => {
      res.status(401).json({ message: "Invalid credentials" });
    });
    return app;
  };

  /**
   * Sign-in stub with a configurable status sequence, e.g.
   * [401, 401, 401, 401, 200, 401, 401] → 4 failures, 1 success, then failures.
   */
  const buildSignInSequenceApp = (statuses: number[]) => {
    const app = express();
    app.use("/auth/sign-in", signInLimiter);
    let index = 0;
    app.post("/auth/sign-in", (_req, res) => {
      const status = statuses[Math.min(index, statuses.length - 1)];
      index += 1;
      res.status(status).json({ message: status === 200 ? "ok" : "Invalid credentials" });
    });
    return app;
  };

  /** Sign-up stub: always succeeds. */
  const buildSignUpApp = () => {
    const app = express();
    app.use("/auth/sign-up", signUpLimiter);
    app.post("/auth/sign-up", (_req, res) => res.status(201).json({ ok: true }));
    return app;
  };

  describe("signInLimiter", () => {
    beforeEach(() => {
      signInLimiter.resetKey(IP);
    });

    it("5 failed attempts • all return 401", async () => {
      const agent = request.agent(buildAlwaysFailSignInApp());

      for (let i = 0; i < 5; i += 1) {
        const res = await agent.post("/auth/sign-in").send({ email: "a@b.c", password: "nope" });
        expect(res.status).toBe(401);
      }
    });

    it("6th failed attempt • returns 429", async () => {
      const agent = request.agent(buildAlwaysFailSignInApp());

      for (let i = 0; i < 5; i += 1) {
        await agent.post("/auth/sign-in").send({ email: "a@b.c", password: "nope" });
      }

      const res = await agent.post("/auth/sign-in").send({ email: "a@b.c", password: "nope" });
      expect(res.status).toBe(429);
    });

    it("successful sign-in does NOT count toward the limit", async () => {
      // 4 failures, 1 success, then 2 more failures → only the 6th failure is blocked
      const agent = request.agent(buildSignInSequenceApp([401, 401, 401, 401, 200, 401, 401]));

      for (let i = 0; i < 4; i += 1) {
        const res = await agent.post("/auth/sign-in").send({});
        expect(res.status).toBe(401);
      }

      const success = await agent.post("/auth/sign-in").send({});
      expect(success.status).toBe(200);

      // 5th failure still accepted (counter is at 5 failures after this one)
      const fifthFailure = await agent.post("/auth/sign-in").send({});
      expect(fifthFailure.status).toBe(401);

      // 6th failure → blocked
      const sixthFailure = await agent.post("/auth/sign-in").send({});
      expect(sixthFailure.status).toBe(429);
    });
  });

  describe("signUpLimiter", () => {
    beforeEach(() => {
      signUpLimiter.resetKey(IP);
    });

    it("10 requests then the 11th • returns 429", async () => {
      const app = buildSignUpApp();

      for (let i = 0; i < 10; i += 1) {
        const res = await request(app).post("/auth/sign-up").send({});
        expect(res.status).toBe(201);
      }

      const blocked = await request(app).post("/auth/sign-up").send({});
      expect(blocked.status).toBe(429);
    });
  });
});
