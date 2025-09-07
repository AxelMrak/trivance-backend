import { MercadoPagoWebhookService } from "@/services/webhooks/MercadoPagoWebhookService";
import * as mpAdapter from "@/services/payments/mercadopagoClient";

beforeAll(() => {
  jest.spyOn(mpAdapter, "getPaymentResource").mockImplementation(
    () =>
      ({
        get: async ({ id }: { id: string }) => {
          if (id === "pay-approved")
            return { id, status: "approved", preference_id: "pref-123" } as any;
          if (id === "pay-rejected")
            return { id, status: "rejected", preference_id: "pref-456" } as any;
          return { id, status: "pending", preference_id: "pref-789" } as any;
        },
      }) as any,
  );
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

  test("throws when missing data entirely", async () => {
    const { service } = makeSvc();
    await expect(service.processWebhook({} as any)).rejects.toThrow(
      "Faltan datos en el cuerpo del webhook",
    );
  });
});

