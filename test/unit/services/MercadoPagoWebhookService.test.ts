import { MercadoPagoWebhookService } from "@/services/webhooks/MercadoPagoWebhookService";
import * as mpAdapter from "@/services/payments/mercadopagoClient";
import { dbClient } from "@/config/db";

describe("MercadoPagoWebhookService", () => {
  let txClient: {
    query: jest.Mock;
    release: jest.Mock;
  };

  const makeSvc = () => {
    const orderService = {
      getOrderByReference: jest.fn(async (ref: string) => {
        if (["pref-123", "pref-456", "pref-789", "999"].includes(ref)) {
          return { id: "order-1", appointment_id: "appt-1", reference_id: ref } as any;
        }
        throw new Error("Orden no encontrada para la referencia dada");
      }),
      updateOrder: jest.fn(async (_id: string, _data: any, _db?: any) => ({})),
    } as any;

    const appointmentService = {
      updateAppointment: jest.fn(async (_id: string, _data: any, _user?: any, _db?: any) => ({})),
    } as any;

    return {
      service: new MercadoPagoWebhookService(orderService, appointmentService),
      orderService,
      appointmentService,
    };
  };

  beforeEach(() => {
    jest.spyOn(mpAdapter, "getPaymentResource").mockImplementation(
      () =>
        ({
          get: async ({ id }: { id: string }) => {
            if (id === "pay-approved")
              return { id, status: "approved", external_reference: "pref-123" } as any;
            if (id === "pay-rejected")
              return { id, status: "rejected", external_reference: "pref-456" } as any;
            return { id, status: "pending", external_reference: "pref-789" } as any;
          },
        }) as any,
    );

    txClient = {
      query: jest.fn(async () => ({ rows: [], rowCount: 0 })) as jest.Mock,
      release: jest.fn() as jest.Mock,
    };
    (jest.spyOn(dbClient, "connect") as unknown as jest.Mock).mockResolvedValue(txClient);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test("fetches payment by id and confirms appointment when approved", async () => {
    const { service, orderService, appointmentService } = makeSvc();

    const payload = { type: "payment", data: { id: "pay-approved" } };
    const result = await service.processWebhook(payload as any);

    expect(orderService.getOrderByReference).toHaveBeenCalledWith("pref-123");
    // Both local mutations run inside ONE transaction on the same client
    expect(orderService.updateOrder).toHaveBeenCalledWith("order-1", { status: "paid" }, txClient);
    expect(appointmentService.updateAppointment).toHaveBeenCalledWith(
      "appt-1",
      { status: "confirmed" },
      undefined,
      txClient,
    );
    expect(txClient.query).toHaveBeenCalledWith("BEGIN");
    expect(txClient.query).toHaveBeenCalledWith("COMMIT");
    expect(txClient.release).toHaveBeenCalledTimes(1);
    expect(result).toEqual({ orderId: "order-1", appointmentId: "appt-1", status: "paid" });
  });

  test("maps rejected payments to cancelled and cancels appointment", async () => {
    const { service, orderService, appointmentService } = makeSvc();

    const payload = { type: "payment", data: { id: "pay-rejected" } };
    const result = await service.processWebhook(payload as any);

    expect(orderService.getOrderByReference).toHaveBeenCalledWith("pref-456");
    expect(orderService.updateOrder).toHaveBeenCalledWith(
      "order-1",
      { status: "cancelled" },
      txClient,
    );
    expect(appointmentService.updateAppointment).toHaveBeenCalledWith(
      "appt-1",
      { status: "cancelled" },
      undefined,
      txClient,
    );
    expect(result).toEqual({ orderId: "order-1", appointmentId: "appt-1", status: "cancelled" });
  });

  test("rolls back and leaves both rows untouched when the second mutation fails", async () => {
    const { service, orderService, appointmentService } = makeSvc();
    appointmentService.updateAppointment.mockRejectedValue(new Error("update failed"));

    await expect(
      service.processWebhook({ type: "payment", data: { id: "pay-approved" } } as any),
    ).rejects.toThrow("update failed");

    // First mutation ran on the tx client; the second failed; everything rolled back
    expect(orderService.updateOrder).toHaveBeenCalledWith("order-1", { status: "paid" }, txClient);
    expect(appointmentService.updateAppointment).toHaveBeenCalledWith(
      "appt-1",
      { status: "confirmed" },
      undefined,
      txClient,
    );
    expect(txClient.query).toHaveBeenCalledWith("ROLLBACK");
    expect(txClient.query.mock.calls.some((call) => call[0] === "COMMIT")).toBe(false);
    expect(txClient.release).toHaveBeenCalledTimes(1);
  });

  test("returns a message when webhook is not a processable payment notification", async () => {
    const { service } = makeSvc();
    const result = await service.processWebhook({} as any);
    expect(result).toEqual({
      message: "Webhook not processed: not a payment notification.",
    });
  });
});