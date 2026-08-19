import { AppointmentService } from "@/services/AppointmentService";

const makeService = () => {
  const appointment = {
    id: "appt-1",
    user_id: "user-1",
    client_id: null,
    service_id: "service-1",
    status: "confirmed",
    start_date: new Date(),
    created_at: new Date(),
    updated_at: new Date(),
  };

  const repository = {
    getCompanyAppointments: jest.fn(async () => [appointment]),
  } as any;

  const serviceHandlerService = {
    getServiceById: jest.fn(async () => ({ id: "service-1", name: "Corte de cabello" })),
  } as any;

  const orderService = {} as any;

  const userRepository = {
    findPublicByIds: jest.fn(async () => []),
  } as any;

  const clientsPivotRepository = {} as any;

  const clientsRepository = {
    getWithUsersByIds: jest.fn(async () => []),
  } as any;

  const serviceRepository = {
    findByIds: jest.fn(async () => [{ id: "service-1", name: "Corte de cabello" }]),
  } as any;

  const service = new AppointmentService(
    repository,
    serviceHandlerService,
    orderService,
    userRepository,
    clientsPivotRepository,
    clientsRepository,
    serviceRepository,
  );

  return { service, repository, serviceRepository, userRepository };
};

describe("AppointmentService.getAll", () => {
  it("includes the service and removes service_id when include.service is set", async () => {
    const { service, serviceRepository } = makeService();

    const result = await service.getAll(
      { userId: "user-1", role: 3, company_id: "company-1" },
      { service: true },
    );

    expect(serviceRepository.findByIds).toHaveBeenCalledWith(["service-1"]);
    expect(result).toHaveLength(1);
    expect(result[0].service).toEqual({ id: "service-1", name: "Corte de cabello" });
    expect(result[0]).not.toHaveProperty("service_id");
  });

  it("still returns the appointments without the include when the service enrichment rejects", async () => {
    const { service, serviceRepository } = makeService();
    serviceRepository.findByIds.mockRejectedValue(new Error("service lookup failed"));

    const result = await service.getAll(
      { userId: "user-1", role: 3, company_id: "company-1" },
      { service: true },
    );

    expect(result).toHaveLength(1);
    expect(result[0]).not.toHaveProperty("service");
    expect(result[0]).not.toHaveProperty("service_id");
  });

  it("propagates failures from the repository when loading appointments", async () => {
    const { service, repository } = makeService();
    repository.getCompanyAppointments.mockRejectedValue(new Error("db down"));

    await expect(
      service.getAll({ userId: "user-1", role: 3, company_id: "company-1" }, { service: true }),
    ).rejects.toThrow("db down");
  });
});
