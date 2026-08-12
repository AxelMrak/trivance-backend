import { Db } from "@/config/db";
import { OrderService } from "@/services/OrderService";

describe("OrderService", () => {
  const makeSvc = () => {
    const repository = {
      create: jest.fn(async (data: any) => ({ id: "order-1", ...data })),
      update: jest.fn(async (id: string, data: any) => ({ id, ...data })),
      findById: jest.fn(async (id: string) => ({ id, reference_id: "pref-1" })),
      findAll: jest.fn(async () => []),
      findByField: jest.fn(async () => null),
      delete: jest.fn(async () => "order-1"),
    } as any;
    return { service: new OrderService(repository), repository };
  };

  test("createOrder forwards data and the optional db to the repository", async () => {
    const { service, repository } = makeSvc();
    const fakeDb = {} as unknown as Db;

    const order = await service.createOrder({ status: "pending" }, fakeDb);

    expect(order).toEqual({ id: "order-1", status: "pending" });
    expect(repository.create).toHaveBeenCalledWith({ status: "pending" }, fakeDb);
  });

  test("updateOrder reads and updates on the same passed db", async () => {
    const { service, repository } = makeSvc();
    const fakeDb = {} as unknown as Db;

    const updated = await service.updateOrder("order-1", { status: "paid" }, fakeDb);

    expect(updated).toEqual({ id: "order-1", status: "paid" });
    expect(repository.findById).toHaveBeenCalledWith("order-1", fakeDb);
    expect(repository.update).toHaveBeenCalledWith("order-1", { status: "paid" }, fakeDb);
  });

  test("updateOrder without db keeps the pool default path (reads via getById)", async () => {
    const { service, repository } = makeSvc();

    await service.updateOrder("order-1", { status: "paid" });

    expect(repository.findById).toHaveBeenCalledWith("order-1");
    expect(repository.update).toHaveBeenCalledWith("order-1", { status: "paid" }, undefined);
  });

  test("updateOrder throws when the order does not exist", async () => {
    const { service, repository } = makeSvc();
    repository.findById.mockResolvedValue(null);

    await expect(service.updateOrder("missing", { status: "paid" })).rejects.toThrow(
      "Orden no encontrada",
    );
  });
});