import { dbClient } from "@/config/db";
import { AppointmentRepository } from "@/repositories/AppointmentRepository";
import { ServiceRepository } from "@/repositories/ServiceRepository";
import { OrderRepository } from "@/repositories/OrderRepository";
import { UserRepository } from "@/repositories/UserRepository";
import { ClientsPivotRepository } from "@/repositories/ClientsPivotRepository";
import { ClientsRepository } from "@/repositories/ClientsRepository";
import { AppointmentService } from "@/services/AppointmentService";
import { ServiceHandlerService } from "@/services/ServiceHandlerService";
import { OrderService } from "@/services/OrderService";
import { createAppointment, createClient, createService, createUser } from "@test/utils/factories";

describe("AppointmentService batch enrichment", () => {
  it("getAll with all includes uses a constant number of queries", async () => {
    const manager = await createUser();
    const { client } = await createClient({ company_id: manager.company_id });
    const service = await createService({ company_id: manager.company_id });
    await createAppointment({
      user_id: manager.id,
      client_id: client.id,
      service_id: service.id,
    });
    await createAppointment({
      user_id: manager.id,
      client_id: client.id,
      service_id: service.id,
    });

    const querySpy = jest.spyOn(dbClient, "query");

    const svc = new AppointmentService(
      new AppointmentRepository(dbClient),
      new ServiceHandlerService(new ServiceRepository(dbClient)),
      new OrderService(new OrderRepository(dbClient)),
      new UserRepository(dbClient),
      new ClientsPivotRepository(),
      new ClientsRepository(),
      new ServiceRepository(dbClient),
    );
    await svc.getAll(
      { userId: manager.id, role: 5, company_id: manager.company_id },
      { service: true, user: true, client: true },
    );

    const count = querySpy.mock.calls.length;
    querySpy.mockRestore();
    expect(count).toBeLessThanOrEqual(6);
  });
});
