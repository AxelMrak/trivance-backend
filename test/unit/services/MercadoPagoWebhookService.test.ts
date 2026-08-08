import { MercadoPagoWebhookService } from "@/services/webhooks/MercadoPagoWebhookService";
import * as mpAdapter from "@/services/payments/mercadopagoClient";

beforeAll(() => {
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
});

beforeEach(() => {
  jest.clearAllMocks();
});

describe("MercadoPagoWebhookService", () => {
  const makeSvc = () => {
    const orderService = {
      getOrderByReference: jest.fn(async (ref: string) => {
        if (["pref-123", "pref-456", "pref-789", "999"].includes(ref)) {
          return { id: "order-1", appointment_id: "appt-1", reference_id: ref } as any;
        }
        throw new Error("Orden no encontrada para la referencia dada");
      }),
      updateOrder: jest.fn(async () => ({})),
    } as any;

    const appointmentService = {
      updateAppointment: jest.fn(async () => ({})),
    } as any;

    return {
      service: new MercadoPagoWebhookService(orderService, appointmentService),
      orderService,
      appointmentService,
    };
  };

  test("fetches payment by id and confirms appointment when approved", async () => {
    const { service, orderService, appointmentService } = makeSvc();

    const payload = { type: "payment", data: { id: "pay-approved" } };
    const result = await service.processWebhook(payload as any);

    expect(orderService.getOrderByReference).toHaveBeenCalledWith("pref-123");
    expect(orderService.updateOrder).toHaveBeenCalledWith("order-1", { status: "paid" });
    expect(appointmentService.updateAppointment).toHaveBeenCalledWith("appt-1", {
      status: "confirmed",
    });
    expect(result).toEqual({ orderId: "order-1", appointmentId: "appt-1", status: "paid" });
  });

  test("maps rejected payments to cancelled and cancels appointment", async () => {
    const { service, orderService, appointmentService } = makeSvc();

    const payload = { type: "payment", data: { id: "pay-rejected" } };
    const result = await service.processWebhook(payload as any);

    expect(orderService.getOrderByReference).toHaveBeenCalledWith("pref-456");
    expect(orderService.updateOrder).toHaveBeenCalledWith("order-1", { status: "cancelled" });
    expect(appointmentService.updateAppointment).toHaveBeenCalledWith("appt-1", {
      status: "cancelled",
    });
    expect(result).toEqual({ orderId: "order-1", appointmentId: "appt-1", status: "cancelled" });
  });

  test("uses Mercado Pago status when live_mode is false", async () => {
    const { service, orderService, appointmentService } = makeSvc();

    const payload = { type: "payment", live_mode: false, data: { id: "pay-rejected" } };
    const result = await service.processWebhook(payload as any);

    expect(mpAdapter.getPaymentResource).toHaveBeenCalledTimes(1);
    expect(orderService.updateOrder).toHaveBeenCalledWith("order-1", { status: "cancelled" });
    expect(appointmentService.updateAppointment).toHaveBeenCalledWith("appt-1", {
      status: "cancelled",
    });
    expect(result).toEqual({ orderId: "order-1", appointmentId: "appt-1", status: "cancelled" });
  });

  test("returns a message when webhook is not a processable payment notification", async () => {
    const { service } = makeSvc();
    const result = await service.processWebhook({} as any);
    expect(result).toEqual({
      message: "Webhook not processed: not a payment notification.",
    });
  });
});
