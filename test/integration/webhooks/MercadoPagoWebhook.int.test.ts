import express, { Express } from "express";
import request from "supertest";
import crypto from "crypto";

jest.mock("@/services/payments/mercadopagoClient", () => ({
  getPaymentResource: jest.fn(),
}));

interface MockPayment {
  id: string;
  status: string;
  external_reference: string;
  transaction_amount: number;
  currency_id: string;
  live_mode: boolean;
  status_detail?: string;
}

const TEST_SECRET = "test-webhook-secret";

let app: Express;
let db: (typeof import("@/config/db"))["dbClient"];
let createAppointment: (typeof import("@test/utils/factories"))["createAppointment"];
let createOrderRow: (typeof import("@test/utils/factories"))["createOrderRow"];
let waitFor: (typeof import("@test/utils/waitFor"))["waitFor"];
let getPaymentResourceMock: jest.Mock;
let OrderRepositoryCtor: (typeof import("@/repositories/OrderRepository"))["OrderRepository"];
let AppointmentRepositoryCtor: (typeof import("@/repositories/AppointmentRepository"))["AppointmentRepository"];

function signedHeader(opts: { bodyId: string; requestId: string; ts: string }): string {
  const manifest = `id:${opts.bodyId};request-id:${opts.requestId};ts:${opts.ts};`;
  const v1 = crypto.createHmac("sha256", TEST_SECRET).update(manifest).digest("hex");
  return `ts=${opts.ts},v1=${v1}`;
}

function postWebhook(opts: {
  bodyId: string;
  requestId: string;
  queryId?: string;
  ts?: string;
  signature?: string;
  body?: Record<string, unknown>;
}): request.Test {
  const ts = opts.ts ?? String(Math.floor(Date.now() / 1000));
  const signature =
    opts.signature ?? signedHeader({ bodyId: opts.bodyId, requestId: opts.requestId, ts });
  const queryId = opts.queryId ?? opts.bodyId;
  const query = queryId ? `?data.id=${encodeURIComponent(queryId)}` : "";
  const body = opts.body ?? { type: "payment", data: { id: opts.bodyId } };
  return request(app)
    .post(`/api/webhooks/mercadopago${query}`)
    .set("x-request-id", opts.requestId)
    .set("x-signature", signature)
    .set("Content-Type", "application/json")
    .send(body);
}

function mockPayment(payment: MockPayment | null): jest.Mock {
  const get = jest.fn().mockResolvedValue(payment);
  getPaymentResourceMock.mockReturnValue({ get });
  return get;
}

describe("MercadoPagoWebhook integration (real service, mocked provider)", () => {
  beforeAll(async () => {
    process.env.MP_WEBHOOK_SECRET = TEST_SECRET;
    jest.resetModules();

    getPaymentResourceMock = (await import("@/services/payments/mercadopagoClient"))
      .getPaymentResource as jest.Mock;
    db = (await import("@/config/db")).dbClient;
    ({ createAppointment, createOrderRow } = await import("@test/utils/factories"));
    ({ waitFor } = await import("@test/utils/waitFor"));

    const { OrderRepository } = await import("@/repositories/OrderRepository");
    OrderRepositoryCtor = OrderRepository;
    const { AppointmentRepository } = await import("@/repositories/AppointmentRepository");
    AppointmentRepositoryCtor = AppointmentRepository;
    const { PaymentEventRepository } = await import("@/repositories/PaymentEventRepository");
    const { MercadoPagoService } = await import("@/services/payments/MercadoPagoService");
    const { MercadoPagoWebhookService } = await import(
      "@/services/webhooks/MercadoPagoWebhookService"
    );
    const { MercadoPagoWebhookController } = await import(
      "@/controllers/webhooks/MercadoPagoWebhookController"
    );

    const orderRepository = new OrderRepository(db);
    const appointmentRepository = new AppointmentRepository(db);
    const paymentEventRepository = new PaymentEventRepository(db);
    const controller = new MercadoPagoWebhookController(
      new MercadoPagoWebhookService(
        orderRepository,
        appointmentRepository,
        paymentEventRepository,
        new MercadoPagoService(),
      ),
    );
    app = express();
    app.post(
      "/api/webhooks/mercadopago",
      express.raw({ type: "application/json" }),
      controller.handle,
    );
  });

  afterAll(async () => {
    await db.end();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe("signature and request validation", () => {
    it("rejects missing headers with 400", async () => {
      const res = await request(app).post("/api/webhooks/mercadopago").send({ foo: "bar" });
      expect(res.status).toBe(400);
    });

    it("rejects an invalid signature with 401", async () => {
      const res = await postWebhook({
        bodyId: `pay-${crypto.randomUUID()}`,
        requestId: `req-${crypto.randomUUID()}`,
        signature: "ts=123,v1=invalid",
      });
      expect(res.status).toBe(401);
    });

    it("rejects a signature whose timestamp is outside the 300s tolerance with 401", async () => {
      const staleTs = String(Math.floor(Date.now() / 1000) + 600);
      const res = await postWebhook({
        bodyId: `pay-${crypto.randomUUID()}`,
        requestId: `req-${crypto.randomUUID()}`,
        ts: staleTs,
      });
      expect(res.status).toBe(401);
    });

    it("rejects when the query data.id does not match the body data.id with 400", async () => {
      const res = await postWebhook({
        bodyId: `pay-${crypto.randomUUID()}`,
        queryId: "pay-different",
        requestId: `req-${crypto.randomUUID()}`,
      });
      expect(res.status).toBe(400);
    });
  });

  describe("processing behaviour", () => {
    it("returns 200 and does not mutate the order when the payment is not found", async () => {
      const appointment = await createAppointment();
      const order = await createOrderRow({ appointment });
      mockPayment(null);
      const res = await postWebhook({
        bodyId: `pay-${crypto.randomUUID()}`,
        requestId: `req-${crypto.randomUUID()}`,
      });
      expect(res.status).toBe(200);
      const { rows } = await db.query("SELECT status FROM orders WHERE id = $1", [order.id]);
      expect(rows[0].status).toBe("pending");
    });

    it("returns 200 on repeated retries when the payment is not found", async () => {
      const appointment = await createAppointment();
      const order = await createOrderRow({ appointment });
      const payId = `pay-${crypto.randomUUID()}`;
      mockPayment(null);
      const first = await postWebhook({
        bodyId: payId,
        requestId: `req-a-${crypto.randomUUID()}`,
      });
      const second = await postWebhook({
        bodyId: payId,
        requestId: `req-b-${crypto.randomUUID()}`,
      });
      expect(first.status).toBe(200);
      expect(second.status).toBe(200);
      const { rows: orderRows } = await db.query("SELECT status FROM orders WHERE id = $1", [
        order.id,
      ]);
      expect(orderRows[0].status).toBe("pending");
    });

    it("returns 200, does not mutate anything and records an event when the external_reference has no order", async () => {
      const payId = `pay-${crypto.randomUUID()}`;
      mockPayment({
        id: payId,
        status: "approved",
        external_reference: `ref-${crypto.randomUUID()}`,
        transaction_amount: 10000,
        currency_id: "ARS",
        live_mode: false,
      });
      const res = await postWebhook({
        bodyId: payId,
        requestId: `req-${crypto.randomUUID()}`,
      });
      expect(res.status).toBe(200);
      const { rows } = await db.query("SELECT * FROM payment_events WHERE payment_id = $1", [
        payId,
      ]);
      expect(rows.length).toBeGreaterThan(0);
    });

    it("does not change the order and records a mismatch event when the amount does not match", async () => {
      const appointment = await createAppointment();
      const order = await createOrderRow({ appointment, amount: 10000, currency: "ARS" });
      const payId = `pay-${crypto.randomUUID()}`;
      mockPayment({
        id: payId,
        status: "approved",
        external_reference: order.reference_id,
        transaction_amount: 9999,
        currency_id: "ARS",
        live_mode: false,
      });
      const res = await postWebhook({
        bodyId: payId,
        requestId: `req-${crypto.randomUUID()}`,
      });
      expect(res.status).toBe(200);
      const { rows } = await db.query(
        "SELECT * FROM payment_events WHERE payment_id = $1 AND reason = 'mismatch'",
        [payId],
      );
      expect(rows.length).toBeGreaterThan(0);
    });

    it("does not mutate the order when the currency does not match", async () => {
      const appointment = await createAppointment();
      const order = await createOrderRow({ appointment, amount: 10000, currency: "ARS" });
      const payId = `pay-${crypto.randomUUID()}`;
      mockPayment({
        id: payId,
        status: "approved",
        external_reference: order.reference_id,
        transaction_amount: 10000,
        currency_id: "USD",
        live_mode: false,
      });
      const res = await postWebhook({
        bodyId: payId,
        requestId: `req-${crypto.randomUUID()}`,
      });
      expect(res.status).toBe(200);
      const { rows } = await db.query("SELECT status FROM orders WHERE id = $1", [order.id]);
      expect(rows[0].status).toBe("pending");
    });

    it("does not mutate the order when live_mode does not match the environment", async () => {
      const appointment = await createAppointment();
      const order = await createOrderRow({ appointment });
      const payId = `pay-${crypto.randomUUID()}`;
      mockPayment({
        id: payId,
        status: "approved",
        external_reference: order.reference_id,
        transaction_amount: 10000,
        currency_id: "ARS",
        live_mode: true,
      });
      const res = await postWebhook({
        bodyId: payId,
        requestId: `req-${crypto.randomUUID()}`,
      });
      expect(res.status).toBe(200);
      const { rows } = await db.query("SELECT status FROM orders WHERE id = $1", [order.id]);
      expect(rows[0].status).toBe("pending");
    });

    it("marks the order paid and the appointment confirmed when the payment is approved", async () => {
      const appointment = await createAppointment();
      const order = await createOrderRow({ appointment, amount: 10000, currency: "ARS" });
      const payId = `pay-${crypto.randomUUID()}`;
      mockPayment({
        id: payId,
        status: "approved",
        external_reference: order.reference_id,
        transaction_amount: 10000,
        currency_id: "ARS",
        live_mode: false,
        status_detail: "accredited",
      });
      const res = await postWebhook({
        bodyId: payId,
        requestId: `req-${crypto.randomUUID()}`,
      });
      expect(res.status).toBe(200);
      await waitFor(async () => {
        const { rows } = await db.query("SELECT status FROM orders WHERE id = $1", [order.id]);
        return rows[0]?.status === "paid";
      }, `order ${order.id} never became paid`);
      const { rows: orderRows } = await db.query("SELECT status FROM orders WHERE id = $1", [
        order.id,
      ]);
      expect(orderRows[0].status).toBe("paid");
      const { rows: appointmentRows } = await db.query(
        "SELECT status FROM appointments WHERE id = $1",
        [appointment.id],
      );
      expect(appointmentRows[0].status).toBe("confirmed");
    });

    it("does not change the order state when the payment is in_process", async () => {
      const appointment = await createAppointment();
      const order = await createOrderRow({ appointment, amount: 10000, currency: "ARS" });
      const payId = `pay-${crypto.randomUUID()}`;
      mockPayment({
        id: payId,
        status: "in_process",
        external_reference: order.reference_id,
        transaction_amount: 10000,
        currency_id: "ARS",
        live_mode: false,
      });
      const res = await postWebhook({
        bodyId: payId,
        requestId: `req-${crypto.randomUUID()}`,
      });
      expect(res.status).toBe(200);
      const { rows } = await db.query("SELECT status FROM orders WHERE id = $1", [order.id]);
      expect(rows[0].status).toBe("pending");
    });

    it("applies the approved transition sent after an initial in_process notification", async () => {
      const appointment = await createAppointment();
      const order = await createOrderRow({ appointment, amount: 10000, currency: "ARS" });
      const payId = `pay-${crypto.randomUUID()}`;
      mockPayment({
        id: payId,
        status: "in_process",
        external_reference: order.reference_id,
        transaction_amount: 10000,
        currency_id: "ARS",
        live_mode: false,
      });
      const first = await postWebhook({
        bodyId: payId,
        requestId: `req-${crypto.randomUUID()}`,
      });
      expect(first.status).toBe(200);

      mockPayment({
        id: payId,
        status: "approved",
        external_reference: order.reference_id,
        transaction_amount: 10000,
        currency_id: "ARS",
        live_mode: false,
      });
      const second = await postWebhook({
        bodyId: payId,
        requestId: `req-${crypto.randomUUID()}`,
      });
      expect(second.status).toBe(200);

      const { rows: orderRows } = await db.query("SELECT status FROM orders WHERE id = $1", [
        order.id,
      ]);
      const { rows: appointmentRows } = await db.query(
        "SELECT status FROM appointments WHERE id = $1",
        [appointment.id],
      );
      expect(orderRows[0].status).toBe("paid");
      expect(appointmentRows[0].status).toBe("confirmed");
    });

    it("marks the order cancelled when the payment is rejected", async () => {
      const appointment = await createAppointment();
      const order = await createOrderRow({ appointment, amount: 10000, currency: "ARS" });
      const payId = `pay-${crypto.randomUUID()}`;
      mockPayment({
        id: payId,
        status: "rejected",
        external_reference: order.reference_id,
        transaction_amount: 10000,
        currency_id: "ARS",
        live_mode: false,
        status_detail: "cc_rejected_other_reason",
      });
      const res = await postWebhook({
        bodyId: payId,
        requestId: `req-${crypto.randomUUID()}`,
      });
      expect(res.status).toBe(200);
      await waitFor(async () => {
        const { rows } = await db.query("SELECT status FROM orders WHERE id = $1", [order.id]);
        return rows[0]?.status === "cancelled";
      }, `order ${order.id} never became cancelled`);
      const { rows } = await db.query("SELECT status FROM orders WHERE id = $1", [order.id]);
      expect(rows[0].status).toBe("cancelled");
    });

    it("rolls back the order change when the appointment update fails", async () => {
      const appointment = await createAppointment();
      const order = await createOrderRow({ appointment, amount: 10000, currency: "ARS" });
      const payId = `pay-${crypto.randomUUID()}`;
      mockPayment({
        id: payId,
        status: "approved",
        external_reference: order.reference_id,
        transaction_amount: 10000,
        currency_id: "ARS",
        live_mode: false,
      });
      jest
        .spyOn(AppointmentRepositoryCtor.prototype, "update")
        .mockRejectedValueOnce(new Error("appointment update boom"));
      const res = await postWebhook({
        bodyId: payId,
        requestId: `req-${crypto.randomUUID()}`,
      });
      expect(res.status).toBe(500);
      const { rows } = await db.query("SELECT status FROM orders WHERE id = $1", [order.id]);
      expect(rows[0].status).toBe("pending");
    });

    it("processes a payment only once and returns 200 on replay", async () => {
      const appointment = await createAppointment();
      const order = await createOrderRow({ appointment, amount: 10000, currency: "ARS" });
      const payId = `pay-${crypto.randomUUID()}`;
      mockPayment({
        id: payId,
        status: "approved",
        external_reference: order.reference_id,
        transaction_amount: 10000,
        currency_id: "ARS",
        live_mode: false,
      });
      const orderUpdateSpy = jest.spyOn(OrderRepositoryCtor.prototype, "update");
      const first = await postWebhook({
        bodyId: payId,
        requestId: `req-a-${crypto.randomUUID()}`,
      });
      const second = await postWebhook({
        bodyId: payId,
        requestId: `req-b-${crypto.randomUUID()}`,
      });
      expect(first.status).toBe(200);
      expect(second.status).toBe(200);
      await waitFor(() => orderUpdateSpy.mock.calls.length >= 1, "order update never happened");
      expect(orderUpdateSpy.mock.calls.length).toBe(1);
      const { rows } = await db.query("SELECT * FROM payment_events WHERE payment_id = $1", [
        payId,
      ]);
      expect(rows.length).toBe(1);
    });

    it("applies a single effect when two concurrent requests share the same payment_id", async () => {
      const appointment = await createAppointment();
      const order = await createOrderRow({ appointment, amount: 10000, currency: "ARS" });
      const payId = `pay-${crypto.randomUUID()}`;
      mockPayment({
        id: payId,
        status: "approved",
        external_reference: order.reference_id,
        transaction_amount: 10000,
        currency_id: "ARS",
        live_mode: false,
      });
      const orderUpdateSpy = jest.spyOn(OrderRepositoryCtor.prototype, "update");
      const [first, second] = await Promise.all([
        postWebhook({
          bodyId: payId,
          requestId: `req-a-${crypto.randomUUID()}`,
        }),
        postWebhook({
          bodyId: payId,
          requestId: `req-b-${crypto.randomUUID()}`,
        }),
      ]);
      expect(first.status).toBe(200);
      expect(second.status).toBe(200);
      await waitFor(() => orderUpdateSpy.mock.calls.length >= 1, "order update never happened");
      expect(orderUpdateSpy.mock.calls.length).toBe(1);
      const { rows } = await db.query("SELECT * FROM payment_events WHERE payment_id = $1", [
        payId,
      ]);
      expect(rows.length).toBe(1);
    });
  });
});
