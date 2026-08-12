import express from "express";
import request from "supertest";

import { globalLimiter } from "@middlewares/security/rateLimiters";

/**
 * T-004 — Global Rate Limiting
 * The system MUST enforce a global request rate limit on all routes
 * (300 requests per minute per IP).
 *
 * Spec scenario: Client exceeds global rate limit → 429.
 */
describe("Global rate limiter #security-middleware", () => {
  beforeEach(() => {
    globalLimiter.resetKey("::ffff:127.0.0.1");
  });

  const buildApp = () => {
    const app = express();
    app.use(globalLimiter);
    app.get("/", (_req, res) => res.status(200).json({ ok: true }));
    return app;
  };

  it("300 requests within the window • all accepted with 200", async () => {
    const agent = request.agent(buildApp());

    for (let i = 0; i < 300; i += 1) {
      const res = await agent.get("/");
      expect(res.status).toBe(200);
      if (res.status !== 200) break; // stop early on regression, report first failure
    }
  });

  it("301st request within the same window • returns 429 Too Many Requests", async () => {
    const agent = request.agent(buildApp());

    for (let i = 0; i < 300; i += 1) {
      await agent.get("/");
    }

    const res = await agent.get("/");
    expect(res.status).toBe(429);
  });
});
