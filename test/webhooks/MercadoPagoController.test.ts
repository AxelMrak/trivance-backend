import express, { Express } from "express";
import request from "supertest";
import crypto from "crypto";
import { MercadoPagoWebhookController } from "@/controllers/webhooks/MercadoPagoWebhookController";
import { MercadoPagoWebhookService } from "@/services/webhooks/MercadoPagoWebhookService";

describe("MercadoPagoWebhookController", () => {
  let app: Express;
  let mockService: Partial<MercadoPagoWebhookService>;
  const TEST_SECRET = "70a2585623178db8140f1d34f6d770c41748bec1823ea6cb6240e86d44026ee7";

  beforeAll(() => {
    process.env.MP_WEBHOOK_SECRET = TEST_SECRET;
  });

  beforeEach(() => {
    mockService = {
      processWebhook: jest.fn().mockResolvedValue({ result: "processed" }),
    };
    const controller = new MercadoPagoWebhookController(mockService as MercadoPagoWebhookService);
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
    expect(res.text).toBe("Encabezados faltantes");
  });

  test("should return 400 for malformed X-Signature header", async () => {
    const res = await request(app)
      .post("/api/webhooks/mercadopago")
      .set("x-request-id", "req-123")
      .set("x-signature", "ts=12345")
      .send({ data: { id: "123" } });
    expect(res.status).toBe(400);
    expect(res.text).toBe("Formato de encabezado inválido");
  });

  test("should return 401 for invalid signature", async () => {
    const payload = { data: { id: "12345" } };
    const timestamp = Date.now().toString();
    const requestId = "test-request-001";
    const manifest = `id:${payload.data.id};request-id:${requestId};ts:${timestamp};`;
    const validSignature = crypto.createHmac("sha256", TEST_SECRET).update(manifest).digest("hex");
    const fakeSignature = validSignature.substring(0, validSignature.length - 1) + "0";
    const signatureHeader = `ts=${timestamp},v1=${fakeSignature}`;

    const res = await request(app)
      .post("/api/webhooks/mercadopago")
      .set("x-request-id", requestId)
      .set("x-signature", signatureHeader)
      .set("Content-Type", "application/json")
      .send(payload);
    expect(res.status).toBe(401);
    expect(res.text).toBe("No autorizado");
    expect(mockService.processWebhook).not.toHaveBeenCalled();
  });

  test("should process valid webhook and return 200", async () => {
    const payload = { data: { id: "99999" }, type: "payment" };
    const timestamp = Date.now().toString();
    const requestId = "req-ABC-999";
    const manifest = `id:${payload.data.id};request-id:${requestId};ts:${timestamp};`;
    const validSignature = crypto.createHmac("sha256", TEST_SECRET).update(manifest).digest("hex");
    const signatureHeader = `ts=${timestamp},v1=${validSignature}`;

    const res = await request(app)
      .post("/api/webhooks/mercadopago")
      .set("x-request-id", requestId)
      .set("x-signature", signatureHeader)
      .set("Content-Type", "application/json")
      .send(payload);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ result: "processed" });
    expect(mockService.processWebhook).toHaveBeenCalledWith(payload);
  });
});
