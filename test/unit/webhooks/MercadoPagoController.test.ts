import express, { Express } from "express";
import request from "supertest";
import crypto from "crypto";

import { PaymentWebhookEventRepository } from "@/repositories/PaymentWebhookEventRepository";

describe("MercadoPagoWebhookController", () => {
  let app: Express;
  let mockOutbox: Partial<PaymentWebhookEventRepository>;
  let ControllerCtor: (typeof import("@/controllers/webhooks/MercadoPagoWebhookController"))["MercadoPagoWebhookController"];
  const TEST_SECRET = "70a2585623178db8140f1d34f6d770c41748bec1823ea6cb6240e86d44026ee7";

  beforeAll(async () => {
    // MP_WEBHOOK_SECRET is captured at module load in constants.ts, so the
    // controller must be imported after the env var is set (same pattern as
    // the integration test).
    process.env.MP_WEBHOOK_SECRET = TEST_SECRET;
    jest.resetModules();
    const mod = await import("@/controllers/webhooks/MercadoPagoWebhookController");
    ControllerCtor = mod.MercadoPagoWebhookController;
  });

  beforeEach(() => {
    mockOutbox = {
      insert: jest.fn().mockResolvedValue({ id: "evt-1" }),
    };
    const controller = new ControllerCtor(mockOutbox as PaymentWebhookEventRepository);
    app = express();
    app.post(
      "/api/webhooks/mercadopago",
      express.raw({ type: "application/json" }),
      controller.handle,
    );
  });

  test("should return 400 for missing headers", async () => {
    const res = await request(app).post("/api/webhooks/mercadopago").send({ foo: "bar" });
    expect(res.status).toBe(400);
    expect(res.text).toBe("Missing required headers");
  });

  test("should return 401 for a signature header without a v1 part", async () => {
    const res = await request(app)
      .post("/api/webhooks/mercadopago?data.id=123")
      .set("x-request-id", "req-123")
      .set("x-signature", "ts=12345")
      .set("Content-Type", "application/json")
      .send({ data: { id: "123" }, type: "payment" });
    expect(res.status).toBe(401);
    expect(res.text).toBe("Invalid signature");
  });

  test("should return 401 for invalid signature", async () => {
    const payload = { data: { id: "12345" }, type: "payment" };
    const timestamp = String(Math.floor(Date.now() / 1000));
    const requestId = "test-request-001";
    const manifest = `id:${payload.data.id};request-id:${requestId};ts:${timestamp};`;
    const validSignature = crypto.createHmac("sha256", TEST_SECRET).update(manifest).digest("hex");
    const fakeSignature = validSignature.substring(0, validSignature.length - 1) + "0";
    const signatureHeader = `ts=${timestamp},v1=${fakeSignature}`;

    const res = await request(app)
      .post(`/api/webhooks/mercadopago?data.id=${payload.data.id}`)
      .set("x-request-id", requestId)
      .set("x-signature", signatureHeader)
      .set("Content-Type", "application/json")
      .send(payload);
    expect(res.status).toBe(401);
    expect(res.text).toBe("Invalid signature");
    expect(mockOutbox.insert).not.toHaveBeenCalled();
  });

  test("should persist the webhook to the outbox and return 200", async () => {
    const payload = { data: { id: "99999" }, type: "payment" };
    const timestamp = String(Math.floor(Date.now() / 1000));
    const requestId = "req-ABC-999";
    const manifest = `id:${payload.data.id};request-id:${requestId};ts:${timestamp};`;
    const validSignature = crypto.createHmac("sha256", TEST_SECRET).update(manifest).digest("hex");
    const signatureHeader = `ts=${timestamp},v1=${validSignature}`;

    const res = await request(app)
      .post(`/api/webhooks/mercadopago?data.id=${payload.data.id}`)
      .set("x-request-id", requestId)
      .set("x-signature", signatureHeader)
      .set("Content-Type", "application/json")
      .send(payload);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: "accepted" });
    expect(mockOutbox.insert).toHaveBeenCalledWith({
      provider: "mercadopago",
      payment_id: payload.data.id,
      payload,
    });
  });

  test("should return 500 (not 200) when the outbox insert fails", async () => {
    mockOutbox.insert = jest.fn().mockRejectedValue(new Error("database unavailable"));
    const payload = { data: { id: "77777" }, type: "payment" };
    const timestamp = String(Math.floor(Date.now() / 1000));
    const requestId = "req-ABC-777";
    const manifest = `id:${payload.data.id};request-id:${requestId};ts:${timestamp};`;
    const validSignature = crypto.createHmac("sha256", TEST_SECRET).update(manifest).digest("hex");
    const signatureHeader = `ts=${timestamp},v1=${validSignature}`;

    const res = await request(app)
      .post(`/api/webhooks/mercadopago?data.id=${payload.data.id}`)
      .set("x-request-id", requestId)
      .set("x-signature", signatureHeader)
      .set("Content-Type", "application/json")
      .send(payload);
    expect(res.status).toBe(500);
    expect(res.body).toEqual({ error: "Internal server error" });
  });
});
