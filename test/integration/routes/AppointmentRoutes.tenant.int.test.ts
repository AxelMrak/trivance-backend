import { getTestAgent } from "@test/setup";
import { createAppointment, createUser } from "@test/utils/factories";
import { generateToken } from "@test/utils/helpers";
import { UserRole } from "@/entities/User";

describe("Appointments tenant isolation", () => {
  it("manager of company A cannot read an appointment of company B", async () => {
    const userB = await createUser();
    const appointmentB = await createAppointment({ user_id: userB.id });

    const managerA = await createUser();
    const tokenA = generateToken(managerA.id, UserRole.MANAGER, managerA.company_id);

    const res = await getTestAgent()
      .get(`/appointments/get/${appointmentB.id}`)
      .set("Authorization", `Bearer ${tokenA}`);

    expect([403, 404]).toContain(res.status);
  });
});
