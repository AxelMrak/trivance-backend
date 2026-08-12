import express from "express";
import request from "supertest";

import app from "@/app";

/**
 * T-003 — Trust Proxy Configuration
 * The system MUST configure Express trust proxy so req.ip reflects the real
 * client IP when running behind nginx (one proxy hop).
 *
 * Spec scenario: Client IP visible behind proxy.
 */
describe("Trust proxy #security-middleware", () => {
  it("app.ts • sets trust proxy to 1 (single nginx hop assumption)", () => {
    expect(app.get("trust proxy")).toBe(1);
  });

  it("behavioural • req.ip resolves the client IP from a single X-Forwarded-For hop", async () => {
    const proxiedApp = express();
    proxiedApp.set("trust proxy", 1);
    proxiedApp.get("/echo", (req, res) => {
      res.json({ ip: req.ip });
    });

    const res = await request(proxiedApp)
      .get("/echo")
      .set("X-Forwarded-For", "203.0.113.7")
      .expect(200);

    expect(res.body.ip).toBe("203.0.113.7");
  });
});
