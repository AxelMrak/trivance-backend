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

  const service = new AppointmentService(
    repository,
    serviceHandlerService,
    {} as any,
    {} as any,
    {} as any,
  );

  return { service, repository, serviceHandlerService };
};

describe("AppointmentService.getAll", () => {
  it("includes the service and removes service_id when include.service is set", async () => {
    const { service, serviceHandlerService } = makeService();

    const result = await service.getAll({ userId: "user-1", role: 3 }, { service: true });

    expect(serviceHandlerService.getServiceById).toHaveBeenCalledWith("service-1");
    expect(result).toHaveLength(1);
    expect(result[0].service).toEqual({ id: "service-1", name: "Corte de cabello" });
    expect(result[0]).not.toHaveProperty("service_id");
  });

  it("propagates the failure instead of returning a partial list when the service include rejects", async () => {
    const { service, serviceHandlerService } = makeService();
    serviceHandlerService.getServiceById.mockRejectedValue(new Error("service lookup failed"));

    await expect(service.getAll({ userId: "user-1", role: 3 }, { service: true })).rejects.toThrow(
      "service lookup failed",
    );
  });
});
