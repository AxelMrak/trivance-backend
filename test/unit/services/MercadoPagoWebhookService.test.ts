import { MercadoPagoWebhookService } from "@/services/webhooks/MercadoPagoWebhookService";
import { dbClient } from "@/config/db";
import { toCents } from "@/utils/money";
import { PaymentData, PaymentStatus } from "@/entities/PaymentProvider";

let fakeClient: { query: jest.Mock; release: jest.Mock };

beforeAll(() => {
  fakeClient = {
    query: jest.fn(async () => ({ rows: [], rowCount: 0 })),
    release: jest.fn(async () => undefined),
  };
  jest.spyOn(dbClient as any, "connect").mockResolvedValue(fakeClient as any);
});

afterAll(() => {
  jest.restoreAllMocks();
});

describe("MercadoPagoWebhookService", () => {
  const makeSvc = () => {
    const orderRepository = {
      findByReference: jest.fn(async (ref: string) => {
        if (["pref-123", "pref-456", "pref-789", "999"].includes(ref)) {
          return {
            id: "order-1",
            appointment_id: "appt-1",
            reference_id: ref,
            status: "pending",
            amount: 10000,
            currency: "ARS",
          };
        }
        return undefined;
      }),
      update: jest.fn(async () => ({})),
    } as any;

    const appointmentRepository = { update: jest.fn(async () => ({})) } as any;
    const paymentEventRepository = {
      insert: jest.fn(async () => ({})),
      findByPaymentId: jest.fn(async () => undefined),
    } as any;

    const provider = {
      getPayment: jest.fn(async (id: string): Promise<PaymentData | null> => {
        const byId: Record<string, { status: PaymentStatus; ref: string }> = {
          "pay-approved": { status: "approved", ref: "pref-123" },
          "pay-rejected": { status: "rejected", ref: "pref-456" },
          "pay-cancelled": { status: "cancelled", ref: "pref-456" },
        };
        const entry = byId[id] ?? { status: "pending" as PaymentStatus, ref: "pref-789" };
        return {
          id,
          status: entry.status,
          externalReference: entry.ref,
          transactionAmountCents: toCents(10000),
          currencyId: "ARS",
          liveMode: false,
        };
      }),
    } as any;

    return {
      service: new MercadoPagoWebhookService(
        orderRepository,
        appointmentRepository,
        paymentEventRepository,
        provider,
      ),
      orderRepository,
      appointmentRepository,
      paymentEventRepository,
      provider,
    };
  };

  test("fetches payment by id and confirms appointment when approved", async () => {
    const { service, orderRepository, appointmentRepository, provider } = makeSvc();

    const payload = { type: "payment", data: { id: "pay-approved" } };
    const result = await service.processWebhook(payload as any);

    expect(provider.getPayment).toHaveBeenCalledWith("pay-approved");
    expect(orderRepository.findByReference).toHaveBeenCalledWith("pref-123");
    expect(orderRepository.update).toHaveBeenCalledWith("order-1", { status: "paid" }, fakeClient);
    expect(appointmentRepository.update).toHaveBeenCalledWith(
      "appt-1",
      { status: "confirmed" },
      fakeClient,
    );
    expect(result).toEqual({ status: "processed" });
  });

  test("maps rejected payments to cancelled and cancels appointment", async () => {
    const { service, orderRepository, appointmentRepository } = makeSvc();

    const payload = { type: "payment", data: { id: "pay-rejected" } };
    const result = await service.processWebhook(payload as any);

    expect(orderRepository.update).toHaveBeenCalledWith(
      "order-1",
      { status: "cancelled" },
      fakeClient,
    );
    expect(appointmentRepository.update).toHaveBeenCalledWith(
      "appt-1",
      { status: "cancelled" },
      fakeClient,
    );
    expect(result).toEqual({ status: "processed" });
  });

  test("maps cancelled payments to cancelled and cancels appointment", async () => {
    const { service, orderRepository, appointmentRepository } = makeSvc();

    const payload = { type: "payment", data: { id: "pay-cancelled" } };
    const result = await service.processWebhook(payload);

    expect(orderRepository.update).toHaveBeenCalledWith(
      "order-1",
      { status: "cancelled" },
      fakeClient,
    );
    expect(appointmentRepository.update).toHaveBeenCalledWith(
      "appt-1",
      { status: "cancelled" },
      fakeClient,
    );
    expect(result).toEqual({ status: "processed" });
  });

  test("ignores payment notifications that are not processable", async () => {
    const { service } = makeSvc();
    const result = await service.processWebhook({} as any);
    expect(result).toEqual({ status: "ignored", reason: "not_payment" });
  });
});
