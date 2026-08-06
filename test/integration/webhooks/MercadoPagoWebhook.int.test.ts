import express, { Express } from "express";
import request from "supertest";
import crypto from "crypto";

import { MercadoPagoWebhookController } from "@/controllers/webhooks/MercadoPagoWebhookController";
import { MercadoPagoWebhookService } from "@/services/webhooks/MercadoPagoWebhookService";

// Mock implementation for the service
const mockOrderService = {
  getOrderByReference: jest.fn(),
  updateOrder: jest.fn(),
};

const mockAppointmentService = {
  updateAppointment: jest.fn(),
};

const mockMercadoPagoWebhookService: MercadoPagoWebhookService = {
  processWebhook: jest.fn(),
} as any;

describe("MercadoPagoWebhookController Integration", () => {
  let app: Express;
  const TEST_SECRET = "a_super_secret_key_for_testing";

  beforeAll(() => {
    process.env.MP_WEBHOOK_SECRET = TEST_SECRET;
  });

  beforeEach(() => {
    jest.clearAllMocks();

    const controller = new MercadoPagoWebhookController(mockMercadoPagoWebhookService);
    app = express();
    // For the real endpoint, we need to use express.raw to get the buffer for signature verification
    app.post("/api/webhooks/mercadopago", express.raw({ type: "application/json" }), controller.handle);
  });

  describe("POST /api/webhooks/mercadopago", () => {
    it("should return 400 for missing headers", async () => {
      const res = await request(app).post("/api/webhooks/mercadopago").send({ foo: "bar" });
      expect(res.status).toBe(400);
      expect(res.text).toBe("Missing required headers");
    });

    it("should return 401 for an invalid signature", async () => {
      const payload = { data: { id: "123" } };
      const res = await request(app)
        .post("/api/webhooks/mercadopago")
        .set("x-request-id", "req-123")
        .set("x-signature", "ts=123,v1=invalid")
        .send(payload);
      expect(res.status).toBe(401);
      expect(res.text).toBe("Unauthorized");
    });

    it("should return 200 and process webhook asynchronously for a valid signature", async () => {
      const payload = { data: { id: "12345" }, type: "payment" };
      const timestamp = Date.now().toString();
      const requestId = "test-request-001";
      const manifest = `id:${payload.data.id};request-id:${requestId};ts:${timestamp};`;
      const validSignature = crypto.createHmac("sha256", TEST_SECRET).update(manifest).digest("hex");
      const signatureHeader = `ts=${timestamp},v1=${validSignature}`;

      // Mock the service to resolve after a short delay to test async behavior
      (mockMercadoPagoWebhookService.processWebhook as jest.Mock).mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve({ status: "processed" }), 50)),
      );

      const res = await request(app)
        .post("/api/webhooks/mercadopago")
        .set("x-request-id", requestId)
        .set("x-signature", signatureHeader)
        .set("Content-Type", "application/json")
        .send(payload);

      // Should respond immediately
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ status: "received" });

      // Wait for the async processing to complete
      await new Promise(resolve => setTimeout(resolve, 100));

      // Check that the service was called
      expect(mockMercadoPagoWebhookService.processWebhook).toHaveBeenCalledWith(payload);
    });
  });

  describe("POST /api/webhooks/mercadopago/test", () => {
    it("should return 404 because the unsigned test route was removed", async () => {
      const res = await request(app).post("/api/webhooks/mercadopago/test").send({
        type: "payment",
        data: { id: "123456" },
      });

      expect(res.status).toBe(404);
    });
  });
});
