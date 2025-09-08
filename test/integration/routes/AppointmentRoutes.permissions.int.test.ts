import { getTestAgent } from "@test/setup";
import { createAppointment, createService, createUser } from "@test/utils/factories";
import { generateToken } from "@test/utils/helpers";
import { UserRole } from "@/entities/User";

describe("Appointments permissions and client linkage", () => {
  it("manager can update status and date for non-owned appointment", async () => {
    const clientUser = await createUser({ role: UserRole.CLIENT });
    const staffManager = await createUser({ role: UserRole.MANAGER, company_id: clientUser.company_id });
    const service = await createService({ company_id: clientUser.company_id });
    // appointment created by client (creator=user_id=client)
    const appointment = await createAppointment({ user_id: clientUser.id, client_id: (await (await import("@/config/db")).dbClient.query(`SELECT id FROM clients WHERE user_id = $1`, [clientUser.id])).rows[0]?.id, service_id: service.id });

    const token = generateToken(staffManager.id, UserRole.MANAGER);
    const res = await getTestAgent()
      .put(`/appointments/update/${appointment.id}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ status: "confirmed", start_date: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString() });

    expect(res.status).toBe(200);
    expect(["confirmed", "pending", "cancelled"]).toContain(res.body.status);
  });

  it("staff cannot update status if not owner", async () => {
    const clientUser = await createUser({ role: UserRole.CLIENT });
    const staff = await createUser({ role: UserRole.STAFF, company_id: clientUser.company_id });
    const service = await createService({ company_id: clientUser.company_id });
    const appointment = await createAppointment({ user_id: clientUser.id, client_id: (await (await import("@/config/db")).dbClient.query(`SELECT id FROM clients WHERE user_id = $1`, [clientUser.id])).rows[0]?.id, service_id: service.id });
    const token = generateToken(staff.id, UserRole.STAFF);

    const res = await getTestAgent()
      .put(`/appointments/update/${appointment.id}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ status: "confirmed" });

    expect(res.status).toBe(403);
  });

  it("client can update description but not status", async () => {
    const clientUser = await createUser({ role: UserRole.CLIENT });
    const service = await createService({ company_id: clientUser.company_id });
    const appointment = await createAppointment({ user_id: clientUser.id, client_id: (await (await import("@/config/db")).dbClient.query(`SELECT id FROM clients WHERE user_id = $1`, [clientUser.id])).rows[0]?.id, service_id: service.id });
    const token = generateToken(clientUser.id, UserRole.CLIENT);

    const okRes = await getTestAgent()
      .put(`/appointments/update/${appointment.id}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ description: "Nueva desc" });
    expect(okRes.status).toBe(200);
    expect(okRes.body.description).toBe("Nueva desc");

    const badRes = await getTestAgent()
      .put(`/appointments/update/${appointment.id}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ status: "confirmed" });
    expect(badRes.status).toBe(403);
  });

  it("staff can create appointment on behalf of a client using client_id", async () => {
    const clientUser = await createUser({ role: UserRole.CLIENT });
    const staff = await createUser({ role: UserRole.STAFF, company_id: clientUser.company_id });
    const service = await createService({ company_id: clientUser.company_id });
    const { rows } = await (await import("@/config/db")).dbClient.query(`SELECT id FROM clients WHERE user_id = $1`, [clientUser.id]);
    const clientId = rows[0].id;
    const token = generateToken(staff.id, UserRole.STAFF);

    const createRes = await getTestAgent()
      .post(`/appointments/create`)
      .set("Authorization", `Bearer ${token}`)
      .send({ service_id: service.id, start_date: new Date(Date.now() + 3600000).toISOString(), description: "Hecho por staff", client_id: clientId });
    expect(createRes.status).toBe(201);
    expect(createRes.body).toHaveProperty("id");
    expect(createRes.body).toHaveProperty("service");
  });
});

