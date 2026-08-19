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
let getPaymentResourceMock: jest.Mock;
let OrderRepositoryCtor: (typeof import("@/repositories/OrderRepository"))["OrderRepository"];
let AppointmentRepositoryCtor: (typeof import("@/repositories/AppointmentRepository"))["AppointmentRepository"];
let worker: import("@/workers/paymentWebhookWorker").PaymentWebhookWorker;
let onDeadLetter: jest.Mock;
let outboxRepository: import("@/repositories/PaymentWebhookEventRepository").PaymentWebhookEventRepository;

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

/** Runs one worker cycle (claims due rows and processes them in one transaction). */
function tick(): Promise<void> {
  return worker.tick();
}

async function outboxRows(paymentId: string): Promise<Array<Record<string, any>>> {
  const { rows } = await db.query(
    "SELECT * FROM payment_webhook_events WHERE payment_id = $1 ORDER BY created_at",
    [paymentId],
  );
  return rows;
}

/** Forces the outbox row for a payment to be claimable again without sleeping. */
async function makeDue(paymentId: string): Promise<void> {
  await db.query(
    "UPDATE payment_webhook_events SET available_at = now() - interval '1 second' WHERE payment_id = $1",
    [paymentId],
  );
}

describe("MercadoPagoWebhook integration (real service + real outbox, mocked provider)", () => {
  beforeAll(async () => {
    process.env.MP_WEBHOOK_SECRET = TEST_SECRET;
    jest.resetModules();

    getPaymentResourceMock = (await import("@/services/payments/mercadopagoClient"))
      .getPaymentResource as jest.Mock;
    db = (await import("@/config/db")).dbClient;
    ({ createAppointment, createOrderRow } = await import("@test/utils/factories"));

    const { OrderRepository } = await import("@/repositories/OrderRepository");
    OrderRepositoryCtor = OrderRepository;
    const { AppointmentRepository } = await import("@/repositories/AppointmentRepository");
    AppointmentRepositoryCtor = AppointmentRepository;
    const { PaymentEventRepository } = await import("@/repositories/PaymentEventRepository");
    const { PaymentWebhookEventRepository } = await import(
      "@/repositories/PaymentWebhookEventRepository"
    );
    const { MercadoPagoService } = await import("@/services/payments/MercadoPagoService");
    const { MercadoPagoWebhookService } = await import(
      "@/services/webhooks/MercadoPagoWebhookService"
    );
    const { PaymentWebhookWorker } = await import("@/workers/paymentWebhookWorker");
    const { MercadoPagoWebhookController } = await import(
      "@/controllers/webhooks/MercadoPagoWebhookController"
    );

    const orderRepository = new OrderRepository(db);
    const appointmentRepository = new AppointmentRepository(db);
    const paymentEventRepository = new PaymentEventRepository(db);
    outboxRepository = new PaymentWebhookEventRepository(db);
    const service = new MercadoPagoWebhookService(
      orderRepository,
      appointmentRepository,
      paymentEventRepository,
      new MercadoPagoService(),
    );
    onDeadLetter = jest.fn();
    worker = new PaymentWebhookWorker(outboxRepository, service, {
      backoffBaseMs: 1000,
      onDeadLetter,
    });
    const controller = new MercadoPagoWebhookController(outboxRepository);
    app = express();
    app.post(
      "/api/webhooks/mercadopago",
      express.raw({ type: "application/json" }),
      controller.handle,
    );
  });

  afterAll(async () => {
    worker.stop();
    await db.end();
  });

  beforeEach(async () => {
    jest.clearAllMocks();
    // Isolate the outbox and event ledger per test: the worker claims the
    // oldest pending rows first, so rows left behind by a previous test would
    // be processed by the next test's tick.
    await db.query("DELETE FROM payment_webhook_events");
    await db.query("DELETE FROM payment_events");
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

  describe("durability: handler persists before acknowledging", () => {
    it("acks 200 for non-payment notifications without writing an outbox row", async () => {
      const bodyId = `pay-${crypto.randomUUID()}`;
      const res = await postWebhook({
        bodyId,
        requestId: `req-${crypto.randomUUID()}`,
        body: { type: "test", data: { id: bodyId } },
      });
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ status: "ignored" });
      const rows = await outboxRows(bodyId);
      expect(rows).toEqual([]);
    });

    it("persists an outbox row and returns 200 without querying the provider", async () => {
      const payId = `pay-${crypto.randomUUID()}`;
      const get = jest.fn();
      getPaymentResourceMock.mockReturnValue({ get });
      const res = await postWebhook({
        bodyId: payId,
        requestId: `req-${crypto.randomUUID()}`,
      });
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ status: "accepted" });
      expect(get).not.toHaveBeenCalled();
      const rows = await outboxRows(payId);
      expect(rows).toHaveLength(1);
      expect(rows[0].status).toBe("pending");
      expect(rows[0].provider).toBe("mercadopago");
      expect(rows[0].payload).toMatchObject({ type: "payment", data: { id: payId } });
      expect(rows[0].attempts).toBe(0);
    });
  });

  describe("processing behaviour (outbox drives async processing)", () => {
    it("retries with backoff and does not mutate the order when the payment is not found", async () => {
      const appointment = await createAppointment();
      const order = await createOrderRow({ appointment });
      const payId = `pay-${crypto.randomUUID()}`;
      mockPayment(null);
      const res = await postWebhook({
        bodyId: payId,
        requestId: `req-${crypto.randomUUID()}`,
      });
      expect(res.status).toBe(200);

      await tick();
      const { rows } = await db.query("SELECT status FROM orders WHERE id = $1", [order.id]);
      expect(rows[0].status).toBe("pending");
      const [event] = await outboxRows(payId);
      expect(event.status).toBe("pending");
      expect(event.attempts).toBe(1);
      expect(event.last_error).toBe("payment_not_found");
      expect(new Date(event.available_at).getTime()).toBeGreaterThan(Date.now());
    });

    it("returns 200 on repeated deliveries while the payment is not found", async () => {
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
      const rows = await outboxRows(payId);
      expect(rows).toHaveLength(1);
      const { rows: orderRows } = await db.query("SELECT status FROM orders WHERE id = $1", [
        order.id,
      ]);
      expect(orderRows[0].status).toBe("pending");
    });

    it("records an event and keeps retrying when the external_reference has no order", async () => {
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

      await tick();
      const { rows } = await db.query("SELECT * FROM payment_events WHERE payment_id = $1", [
        payId,
      ]);
      expect(rows.length).toBeGreaterThan(0);
      const [event] = await outboxRows(payId);
      expect(event.status).toBe("pending");
      expect(event.attempts).toBe(1);
      expect(event.last_error).toBe("order_not_found");
    });

    it("dead-letters and records a mismatch event when the amount does not match", async () => {
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

      await tick();
      const { rows } = await db.query(
        "SELECT * FROM payment_events WHERE payment_id = $1 AND reason = 'mismatch'",
        [payId],
      );
      expect(rows.length).toBeGreaterThan(0);
      const [event] = await outboxRows(payId);
      expect(event.status).toBe("dead_letter");
      expect(event.last_error).toBe("mismatch");
      expect(onDeadLetter).toHaveBeenCalledTimes(1);
    });

    it("dead-letters and does not mutate the order when the currency does not match", async () => {
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

      await tick();
      const { rows } = await db.query("SELECT status FROM orders WHERE id = $1", [order.id]);
      expect(rows[0].status).toBe("pending");
      const [event] = await outboxRows(payId);
      expect(event.status).toBe("dead_letter");
      expect(event.last_error).toBe("mismatch");
    });

    it("dead-letters and does not mutate the order when live_mode does not match the environment", async () => {
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

      await tick();
      const { rows } = await db.query("SELECT status FROM orders WHERE id = $1", [order.id]);
      expect(rows[0].status).toBe("pending");
      const [event] = await outboxRows(payId);
      expect(event.status).toBe("dead_letter");
      expect(event.last_error).toBe("live_mode_mismatch");
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

      await tick();
      const { rows: orderRows } = await db.query("SELECT status FROM orders WHERE id = $1", [
        order.id,
      ]);
      expect(orderRows[0].status).toBe("paid");
      const { rows: appointmentRows } = await db.query(
        "SELECT status FROM appointments WHERE id = $1",
        [appointment.id],
      );
      expect(appointmentRows[0].status).toBe("confirmed");
      const [event] = await outboxRows(payId);
      expect(event.status).toBe("processed");
      expect(event.processed_at).not.toBeNull();
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

      await tick();
      const { rows } = await db.query("SELECT status FROM orders WHERE id = $1", [order.id]);
      expect(rows[0].status).toBe("pending");
      const [event] = await outboxRows(payId);
      expect(event.status).toBe("processed");
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

      await tick();
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

      await tick();
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

      await tick();
      const { rows } = await db.query("SELECT status FROM orders WHERE id = $1", [order.id]);
      expect(rows[0].status).toBe("cancelled");
      const [event] = await outboxRows(payId);
      expect(event.status).toBe("processed");
    });

    it("keeps the webhook queued for retry when processing throws", async () => {
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
      expect(res.status).toBe(200);

      await tick();
      // The failed transaction rolled back, so the order is untouched and the
      // outbox row is re-scheduled with backoff instead of being lost.
      const { rows } = await db.query("SELECT status FROM orders WHERE id = $1", [order.id]);
      expect(rows[0].status).toBe("pending");
      const [event] = await outboxRows(payId);
      expect(event.status).toBe("pending");
      expect(event.attempts).toBe(1);
      expect(event.last_error).toBe("appointment update boom");
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

      await tick();
      expect(orderUpdateSpy.mock.calls.length).toBe(1);
      const { rows } = await db.query("SELECT * FROM payment_events WHERE payment_id = $1", [
        payId,
      ]);
      expect(rows.length).toBe(1);
      const events = await outboxRows(payId);
      expect(events).toHaveLength(1);
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

      await tick();
      expect(orderUpdateSpy.mock.calls.length).toBe(1);
      const { rows } = await db.query("SELECT * FROM payment_events WHERE payment_id = $1", [
        payId,
      ]);
      expect(rows.length).toBe(1);
      const events = await outboxRows(payId);
      expect(events).toHaveLength(1);
    });
  });

  describe("outbox retry and dead-letter lifecycle", () => {
    it("does not create a second outbox row for a duplicate webhook delivery", async () => {
      const payId = `pay-${crypto.randomUUID()}`;
      mockPayment(null);
      const first = await postWebhook({
        bodyId: payId,
        requestId: `req-a-${crypto.randomUUID()}`,
      });
      // Same payment_id delivered again (MP retries its own delivery).
      const second = await postWebhook({
        bodyId: payId,
        requestId: `req-b-${crypto.randomUUID()}`,
      });
      expect(first.status).toBe(200);
      expect(second.status).toBe(200);
      const rows = await outboxRows(payId);
      expect(rows).toHaveLength(1);
    });

    it("retries a transient payment_not_found with backoff and dead-letters after maxAttempts", async () => {
      const payId = `pay-${crypto.randomUUID()}`;
      mockPayment(null);
      const res = await postWebhook({
        bodyId: payId,
        requestId: `req-${crypto.randomUUID()}`,
      });
      expect(res.status).toBe(200);

      // First attempt schedules a retry with attempts=1 and future available_at.
      await tick();
      let [event] = await outboxRows(payId);
      expect(event.status).toBe("pending");
      expect(event.attempts).toBe(1);
      expect(event.last_error).toBe("payment_not_found");
      expect(new Date(event.available_at).getTime()).toBeGreaterThan(Date.now());

      // Drive the remaining attempts without sleeping (maxAttempts = 5).
      await makeDue(payId);
      await tick();
      [event] = await outboxRows(payId);
      expect(event.status).toBe("pending");
      expect(event.attempts).toBe(2);

      await makeDue(payId);
      await tick();
      [event] = await outboxRows(payId);
      expect(event.status).toBe("pending");
      expect(event.attempts).toBe(3);

      await makeDue(payId);
      await tick();
      [event] = await outboxRows(payId);
      expect(event.status).toBe("pending");
      expect(event.attempts).toBe(4);

      // Fifth attempt exhausts maxAttempts: dead letter.
      await makeDue(payId);
      await tick();
      [event] = await outboxRows(payId);
      expect(event.status).toBe("dead_letter");
      expect(event.last_error).toBe("payment_not_found");
      expect(onDeadLetter).toHaveBeenCalledTimes(1);
      expect(onDeadLetter.mock.calls[0][0]).toMatchObject({ payment_id: payId });
    });

    it("sends a permanent mismatch straight to the dead letter", async () => {
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

      await tick();
      const [event] = await outboxRows(payId);
      expect(event.status).toBe("dead_letter");
      expect(event.attempts).toBe(0);
      expect(event.last_error).toBe("mismatch");
      expect(onDeadLetter).toHaveBeenCalledTimes(1);
    });

    it("re-opens a processed row when the same payment is delivered again (refund-after-approved)", async () => {
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
      const first = await postWebhook({
        bodyId: payId,
        requestId: `req-a-${crypto.randomUUID()}`,
      });
      expect(first.status).toBe(200);

      await tick();
      let [event] = await outboxRows(payId);
      expect(event.status).toBe("processed");

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
        requestId: `req-b-${crypto.randomUUID()}`,
      });
      expect(second.status).toBe(200);

      [event] = await outboxRows(payId);
      expect(event.status).toBe("pending");
      expect(event.attempts).toBe(0);
      expect(event.last_error).toBeNull();

      await tick();
      [event] = await outboxRows(payId);
      expect(event.status).toBe("processed");
    });
  });
});
