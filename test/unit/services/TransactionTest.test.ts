import { dbClient, transaction } from "@/config/db";
import { AppointmentRepository } from "@/repositories/AppointmentRepository";
import { OrderRepository } from "@/repositories/OrderRepository";
import { AppointmentService } from "@/services/AppointmentService";
import { OrderService } from "@/services/OrderService";
import { PaymentServiceFactory } from "@/services/payments/PaymentServiceFactory";
import * as mpAdapter from "@/services/payments/mercadopagoClient";
import { MercadoPagoWebhookService } from "@/services/webhooks/MercadoPagoWebhookService";

type FakeClient = {
  query: jest.Mock;
  release: jest.Mock;
};

const makeClient = (): FakeClient => ({
  query: jest.fn(async () => ({ rows: [], rowCount: 0 })),
  release: jest.fn(async () => undefined),
});

describe("transaction()", () => {
  test("commits on success", async () => {
    const client = makeClient();
    const connectSpy = jest.spyOn(dbClient as any, "connect").mockResolvedValue(client as any);
    try {
      const result = await transaction(async (db) => {
        await db.query("INSERT INTO orders (id) VALUES ($1)", ["order-1"]);
        return "ok";
      });

      expect(result).toBe("ok");
      expect(client.query).toHaveBeenCalledWith("BEGIN");
      expect(client.query).toHaveBeenCalledWith("COMMIT");
      expect(client.query).not.toHaveBeenCalledWith("ROLLBACK");
      expect(client.release).toHaveBeenCalledTimes(1);
    } finally {
      connectSpy.mockRestore();
    }
  });

  test("rolls back on failure", async () => {
    const client = makeClient();
    const connectSpy = jest.spyOn(dbClient as any, "connect").mockResolvedValue(client as any);
    try {
      await expect(
        transaction(async () => {
          throw new Error("boom");
        }),
      ).rejects.toThrow("boom");

      expect(client.query).toHaveBeenCalledWith("BEGIN");
      expect(client.query).toHaveBeenCalledWith("ROLLBACK");
      expect(client.query).not.toHaveBeenCalledWith("COMMIT");
      expect(client.release).toHaveBeenCalledTimes(1);
    } finally {
      connectSpy.mockRestore();
    }
  });

  test("releases the client and rethrows the original error even if ROLLBACK fails", async () => {
    const client = makeClient();
    client.query = jest.fn(async (sql: string) => {
      if (sql === "ROLLBACK") {
        throw new Error("rollback failed");
      }
      return { rows: [], rowCount: 0 };
    });
    const connectSpy = jest.spyOn(dbClient as any, "connect").mockResolvedValue(client as any);
    try {
      await expect(
        transaction(async () => {
          throw new Error("work failed");
        }),
      ).rejects.toThrow("work failed");

      expect(client.query).toHaveBeenCalledWith("ROLLBACK");
      expect(client.release).toHaveBeenCalledTimes(1);
    } finally {
      connectSpy.mockRestore();
    }
  });
});

describe("AppointmentService.createPaymentLink", () => {
  test("calls Mercado Pago AFTER the transaction commits and wraps order create+update atomically", async () => {
    const events: string[] = [];
    const orderRow = {
      id: "order-1",
      appointment_id: "appt-1",
      status: "pending",
      provider: "mercadopago",
      reference_id: "temp-ref",
    };
    const appointmentRow = {
      id: "appt-1",
      user_id: "user-1",
      service_id: "svc-1",
      status: "confirmed",
      start_date: "2026-08-15T10:00:00.000Z",
      description: "",
    };

    // Client handed out by connect() — represents the transaction connection.
    const client = makeClient();
    client.query = jest.fn(async (sql: string) => {
      if (sql === "BEGIN") {
        events.push("BEGIN");
      } else if (sql === "COMMIT") {
        events.push("COMMIT");
      } else if (sql === "ROLLBACK") {
        events.push("ROLLBACK");
      } else if (sql.includes("INSERT INTO orders")) {
        events.push("CREATE_ORDER");
        return { rows: [orderRow], rowCount: 1 };
      } else if (sql.includes("UPDATE orders")) {
        events.push("UPDATE_ORDER");
        return { rows: [orderRow], rowCount: 1 };
      } else if (sql.includes("FROM orders")) {
        // Existence read inside the transaction must see the just-created row
        return { rows: [orderRow], rowCount: 1 };
      }
      return { rows: [], rowCount: 0 };
    });
    const connectSpy = jest.spyOn(dbClient as any, "connect").mockResolvedValue(client as any);
    // Pool-level queries (appointment lookups outside the transaction).
    const poolQuerySpy = jest.spyOn(dbClient as any, "query").mockImplementation((async (
      sql: string,
    ) => {
      if (sql.includes("FROM appointments")) {
        return { rows: [appointmentRow], rowCount: 1 };
      }
      if (sql.includes("FROM orders")) {
        return { rows: [orderRow], rowCount: 1 };
      }
      return { rows: [], rowCount: 0 };
    }) as any);
    const providerSpy = jest.spyOn(PaymentServiceFactory, "getProvider").mockReturnValue({
      createPaymentLink: jest.fn(async () => {
        events.push("HTTP_MP");
        return { init_point: "https://pay.example.com/checkout", id: "pref-1" };
      }),
    } as any);

    const orderService = new OrderService(new OrderRepository(dbClient));
    const createSpy = jest.spyOn(orderService, "createOrder");
    const updateSpy = jest.spyOn(orderService, "updateOrder");
    const appointmentService = new AppointmentService(
      new AppointmentRepository(dbClient),
      {
        getServiceById: jest.fn(async () => ({ id: "svc-1", name: "Corte", price: 1500 })),
      } as any,
      orderService,
      {} as any,
      {} as any,
      {} as any,
    );

    try {
      const result = await appointmentService.createPaymentLink("appt-1", "user-1", {
        userId: "user-1",
        role: 5,
        company_id: "company-1",
      });

      expect(result.orderId).toBe("order-1");
      expect(result.paymentLink).toBe("https://pay.example.com/checkout");

      // createOrder and updateOrder must run INSIDE the transaction (same client)…
      expect(createSpy).toHaveBeenCalledWith(
        expect.objectContaining({ appointment_id: "appt-1", reference_id: expect.any(String) }),
        client,
      );
      expect(updateSpy).toHaveBeenCalledWith("order-1", { reference_id: "order-1" }, client);
      // …and the HTTP call to the provider must happen AFTER the commit.
      const order = (name: string) => events.indexOf(name);
      expect(order("BEGIN")).toBeGreaterThanOrEqual(0);
      expect(order("BEGIN")).toBeLessThan(order("CREATE_ORDER"));
      expect(order("CREATE_ORDER")).toBeLessThan(order("UPDATE_ORDER"));
      expect(order("UPDATE_ORDER")).toBeLessThan(order("COMMIT"));
      expect(order("COMMIT")).toBeLessThan(order("HTTP_MP"));
      expect(client.query).not.toHaveBeenCalledWith("ROLLBACK");
    } finally {
      connectSpy.mockRestore();
      providerSpy.mockRestore();
      poolQuerySpy.mockRestore();
      createSpy.mockRestore();
      updateSpy.mockRestore();
    }
  });
});

describe("MercadoPagoWebhookService.processWebhook", () => {
  const makeFakeClient = (events: string[]): FakeClient => ({
    query: jest.fn(async (sql: string) => {
      events.push(sql);
      return { rows: [], rowCount: 0 };
    }),
    release: jest.fn(async () => undefined),
  });

  beforeAll(() => {
    jest.spyOn(mpAdapter, "getPaymentResource").mockImplementation(
      () =>
        ({
          get: async ({ id }: { id: string }) =>
            ({ id, status: "approved", external_reference: "pref-123" }) as any,
        }) as any,
    );
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("runs order + appointment status updates in the same transaction", async () => {
    const events: string[] = [];
    const client = makeFakeClient(events);
    const connectSpy = jest.spyOn(dbClient as any, "connect").mockResolvedValue(client as any);
    const orderService = {
      getOrderByReference: jest.fn(async () => ({ id: "order-1", appointment_id: "appt-1" })),
      updateOrder: jest.fn(async () => ({})),
    } as any;
    const appointmentService = {
      updateAppointment: jest.fn(async () => ({})),
    } as any;
    const svc = new MercadoPagoWebhookService(orderService, appointmentService);

    try {
      const result = await svc.processWebhook({
        type: "payment",
        data: { id: "pay-1" },
        live_mode: false,
      } as any);

      expect(result).toEqual({ orderId: "order-1", appointmentId: "appt-1", status: "paid" });
      // Both updates must use the SAME transaction client.
      expect(orderService.updateOrder).toHaveBeenCalledWith("order-1", { status: "paid" }, client);
      expect(appointmentService.updateAppointment).toHaveBeenCalledWith(
        "appt-1",
        { status: "confirmed" },
        undefined,
        client,
      );
      expect(events).toEqual(["BEGIN", "COMMIT"]);
      expect(client.release).toHaveBeenCalledTimes(1);
    } finally {
      connectSpy.mockRestore();
    }
  });

  test("rolls back both updates when the appointment update fails", async () => {
    const events: string[] = [];
    const client = makeFakeClient(events);
    const connectSpy = jest.spyOn(dbClient as any, "connect").mockResolvedValue(client as any);
    const orderService = {
      getOrderByReference: jest.fn(async () => ({ id: "order-1", appointment_id: "appt-1" })),
      updateOrder: jest.fn(async () => ({})),
    } as any;
    const appointmentService = {
      updateAppointment: jest.fn(async () => {
        throw new Error("appointment update failed");
      }),
    } as any;
    const svc = new MercadoPagoWebhookService(orderService, appointmentService);

    try {
      await expect(
        svc.processWebhook({ type: "payment", data: { id: "pay-1" }, live_mode: false } as any),
      ).rejects.toThrow("appointment update failed");

      expect(orderService.updateOrder).toHaveBeenCalledWith("order-1", { status: "paid" }, client);
      expect(appointmentService.updateAppointment).toHaveBeenCalledWith(
        "appt-1",
        { status: "confirmed" },
        undefined,
        client,
      );
      expect(events).toEqual(["BEGIN", "ROLLBACK"]);
      expect(client.release).toHaveBeenCalledTimes(1);
    } finally {
      connectSpy.mockRestore();
    }
  });
});
