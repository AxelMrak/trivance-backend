import { getTestAgent } from "@test/setup";
import { createUser, createService, createAppointment } from "@test/utils/factories";
import { generateToken } from "@test/utils/helpers";
import { UserRole } from "@/entities/User";

describe("Appointments Availability - occupied slots endpoint", () => {
  it("returns occupied slots for the given month for client", async () => {
    const client = await createUser({ role: UserRole.CLIENT });
    const token = generateToken(client.id, UserRole.CLIENT);
    const service = await createService({ company_id: client.company_id, duration: "01:00:00" });
    const start = new Date();
    start.setHours(10, 0, 0, 0);
    const appt = await createAppointment({ user_id: client.id, service_id: service.id, start_date: start, status: "confirmed" } as any);

    const month = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, "0")}`;
    const res = await getTestAgent()
      .get(`/appointments/occupiedSlots?month=${month}`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    const body = res.body as Record<string, string[]>;
    const dateKey = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, "0")}-${String(start.getDate()).padStart(2, "0")}`;
    expect(Array.isArray(body[dateKey])).toBe(true);
    expect(body[dateKey]).toContain("10:00");
  });
});

