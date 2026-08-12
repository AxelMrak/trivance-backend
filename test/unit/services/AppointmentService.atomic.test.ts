import { AppointmentService } from "@/services/AppointmentService";
import { dbClient, Db } from "@/config/db";
import { PaymentServiceFactory } from "@/services/payments/PaymentServiceFactory";

describe("AppointmentService - createPaymentLink", () => {
  const makeTxClient = () => ({
    query: jest.fn(async () => ({ rows: [], rowCount: 0 })) as jest.Mock,
    release: jest.fn() as jest.Mock,
  });

  const makeSvc = () => {
    const appointment: any = {
      id: "appt-1",
      user_id: "user-1",
      service_id: "svc-1",
      start_date: "2026-09-01T10:00:00.000Z",
      client_id: null,
    };
    const repository = {
      getAppointmentByIdWithJoins: jest.fn(async () => appointment),
      findById: jest.fn(async () => appointment),
      update: jest.fn(async (id: string, data: any) => ({ id, ...data })),
    };
    const serviceHandler = {
      getServiceById: jest.fn(async () => ({
        id: "svc-1",
        name: "Corte de pelo",
        price: 5000,
      })),
    };
    const orderService = {
      createOrder: jest.fn(async (data: any) => ({ id: "order-1", ...data })),
      updateOrder: jest.fn(async (id: string, data: any) => ({ id, ...data })),
    };
    const userRepository = { findById: jest.fn(async () => ({ id: "user-1" })) };
    const service = new AppointmentService(
      repository as any,
      serviceHandler as any,
      orderService as any,
      userRepository as any,
      {} as any,
    );
    return { service, repository, serviceHandler, orderService };
  };

  const mockProvider = () => ({
    createPaymentLink: jest.fn(async ({ id }: { id: string }) => ({
      id: `pref-${id}`,
      init_point: `https://payments.example.test/pay/${id}`,
    })),
  });

  let txClient: ReturnType<typeof makeTxClient>;
  let connectSpy: jest.SpyInstance;

  beforeEach(() => {
    txClient = makeTxClient();
    connectSpy = (jest.spyOn(dbClient, "connect") as unknown as jest.Mock).mockResolvedValue(
      txClient,
    );
    jest.spyOn(PaymentServiceFactory, "getProvider").mockReturnValue(mockProvider() as any);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test("creates the order and its stable reference atomically on the same transaction client", async () => {
    const { service, orderService } = makeSvc();

    const result = await service.createPaymentLink("appt-1", "user-1");

    const createCall = (orderService.createOrder as jest.Mock).mock.calls[0];
    expect(createCall[0]).toEqual(
      expect.objectContaining({
        appointment_id: "appt-1",
        status: "pending",
        provider: "mercadopago",
        reference_id: expect.any(String),
      }),
    );
    // Temporary reference is NOT the stable order id — it is reassigned inside the tx
    expect(createCall[0].reference_id).not.toBe("order-1");
    // Both local mutations run on the SAME client the transaction checked out
    expect(createCall[1]).toBe(txClient);
    expect(orderService.updateOrder).toHaveBeenCalledTimes(1);
    expect(orderService.updateOrder).toHaveBeenCalledWith(
      "order-1",
      { reference_id: "order-1" },
      txClient,
    );
    expect(result).toEqual({
      orderId: "order-1",
      paymentLink: "https://payments.example.test/pay/appt-1",
      paymentDetails: {
        id: "pref-appt-1",
        init_point: "https://payments.example.test/pay/appt-1",
      },
    });
  });

  test("commits before calling the payment provider (no HTTP inside the tx)", async () => {
    const events: string[] = [];
    txClient.query.mockImplementation(async (sql: string) => {
      if (sql === "BEGIN" || sql === "COMMIT") events.push(sql);
      return { rows: [], rowCount: 0 };
    });
    const provider = mockProvider();
    provider.createPaymentLink.mockImplementation(async () => {
      events.push("provider");
      return { id: "pref-x", init_point: "https://payments.example.test/pay/x" };
    });
    jest.spyOn(PaymentServiceFactory, "getProvider").mockReturnValue(provider as any);
    const { service } = makeSvc();

    await service.createPaymentLink("appt-1", "user-1");

    expect(events).toEqual(["BEGIN", "COMMIT", "provider"]);
    expect(txClient.release).toHaveBeenCalledTimes(1);
  });

  test("rolls back and skips the provider when the transaction work fails", async () => {
    const txError = new Error("tx failed");
    txClient.query.mockImplementation(async (sql: string) => {
      if (sql === "BEGIN") return { rows: [], rowCount: 0 };
      throw txError;
    });
    const provider = mockProvider();
    jest.spyOn(PaymentServiceFactory, "getProvider").mockReturnValue(provider as any);
    const { service } = makeSvc();

    await expect(service.createPaymentLink("appt-1", "user-1")).rejects.toBe(txError);

    expect(txClient.query).toHaveBeenCalledWith("ROLLBACK");
    expect(provider.createPaymentLink).not.toHaveBeenCalled();
    expect(txClient.release).toHaveBeenCalledTimes(1);
  });

  test("surfaces InternalServerError and skips the provider when order creation fails inside the tx", async () => {
    const provider = mockProvider();
    jest.spyOn(PaymentServiceFactory, "getProvider").mockReturnValue(provider as any);
    const { service, orderService } = makeSvc();
    orderService.createOrder.mockResolvedValue(null);

    await expect(service.createPaymentLink("appt-1", "user-1")).rejects.toThrow(
      "Fallo al crear el pedido asociado al turno",
    );

    expect(provider.createPaymentLink).not.toHaveBeenCalled();
    expect(txClient.query).toHaveBeenCalledWith("ROLLBACK");
  });
});

describe("AppointmentService - updateAppointment with optional db", () => {
  const TX_DB = { query: jest.fn() } as unknown as Db;

  const makeSvc = () => {
    const appointment: any = {
      id: "appt-1",
      user_id: "user-1",
      service_id: "svc-1",
      status: "pending",
    };
    const repository = {
      getAppointmentByIdWithJoins: jest.fn(async () => appointment),
      findById: jest.fn(async () => appointment),
      update: jest.fn(async (id: string, data: any) => ({ id, ...data })),
    };
    const serviceHandler = {
      getServiceById: jest.fn(async () => ({ id: "svc-1", name: "Corte de pelo" })),
    };
    const userRepository = { findById: jest.fn(async () => ({ id: "user-1" })) };
    const service = new AppointmentService(
      repository as any,
      serviceHandler as any,
      {} as any,
      userRepository as any,
      {} as any,
    );
    return { service, repository, serviceHandler };
  };

  test("reads and updates on the passed db and skips enrichment reads inside a transaction", async () => {
    const { service, repository, serviceHandler } = makeSvc();

    const updated = await service.updateAppointment(
      "appt-1",
      { status: "confirmed" },
      undefined,
      TX_DB,
    );

    expect(repository.findById).toHaveBeenCalledWith("appt-1", TX_DB);
    expect(repository.update).toHaveBeenCalledWith("appt-1", { status: "confirmed" }, TX_DB);
    // Enrichment would hit the global pool on another connection (deadlock when the
    // pool has a single client) — it must be skipped while inside a transaction.
    expect(repository.getAppointmentByIdWithJoins).not.toHaveBeenCalled();
    expect(serviceHandler.getServiceById).not.toHaveBeenCalled();
    expect(updated).toEqual({ id: "appt-1", status: "confirmed" });
  });

  test("keeps enrichment reads when no db is passed (existing caller behavior)", async () => {
    const { service, repository, serviceHandler } = makeSvc();

    const updated = await service.updateAppointment("appt-1", { status: "confirmed" });

    expect(repository.findById).toHaveBeenCalledWith("appt-1", undefined);
    expect(repository.update).toHaveBeenCalledWith("appt-1", { status: "confirmed" }, undefined);
    expect(repository.getAppointmentByIdWithJoins).toHaveBeenCalled();
    expect(serviceHandler.getServiceById).toHaveBeenCalled();
    expect(updated).toEqual(
      expect.objectContaining({
        id: "appt-1",
        status: "pending", // fresh join read, not the patched row
        service: expect.objectContaining({ name: "Corte de pelo" }),
      }),
    );
  });
});