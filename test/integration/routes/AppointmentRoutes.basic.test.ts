import { createUser, createService, createAppointment } from "@test/utils/factories";
import { getTestAgent } from "@test/setup";
import { signInAndGetToken } from "@test/utils/helpers";

describe("Appointments Endpoints - Basic", () => {
  let token: string;
  let user: any;
  let service: any;

  beforeEach(async () => {
    user = await createUser();
    service = await createService({ company_id: user.company_id, requires_deposit: false });
    token = await signInAndGetToken(user.email, (user as any).plainPassword);
  });

  it("POST /api/appointments/create • valid payload without deposit • returns 201 confirmed", async () => {
    const start = new Date(Date.now() + 60 * 60 * 1000).toISOString();

    const res = await getTestAgent()
      .post("/api/appointments/create")
      .set("Authorization", `Bearer ${token}`)
      .send({ service_id: service.id, start_date: start, description: "Test" });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty("id");
    expect(res.body).toHaveProperty("service_id", service.id);
    expect(res.body).toHaveProperty("user_id", user.id);
    expect(res.body).toHaveProperty("status", "confirmed");
  });

  it("POST /api/appointments/create • invalid payload • returns 400 with message", async () => {
    const res = await getTestAgent()
      .post("/api/appointments/create")
      .set("Authorization", `Bearer ${token}`)
      .send({ service_id: "", start_date: "not-a-date" });

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty("message");
  });

  it("GET /api/appointments/getAll • user has appointments • returns 200 and array", async () => {
    await createAppointment({ user_id: user.id, service_id: service.id });
    await createAppointment({ user_id: user.id, service_id: service.id });

    const res = await getTestAgent()
      .get("/api/appointments/getAll")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThanOrEqual(2);
    if (res.body.length > 0) {
      expect(res.body[0]).toHaveProperty("service");
      expect(res.body[0]).toHaveProperty("user");
    }
  });

  it("GET /api/appointments/get/:id • existing appointment • returns 200 with entity", async () => {
    const appt = await createAppointment({ user_id: user.id, service_id: service.id });

    const res = await getTestAgent()
      .get(`/api/appointments/get/${appt.id}`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("id", appt.id);
  });

  it("PUT /api/appointments/update/:id • valid changes • returns 206 with updated fields", async () => {
    const appt = await createAppointment({ user_id: user.id, service_id: service.id });
    const newDate = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString();

    const res = await getTestAgent()
      .put(`/api/appointments/update/${appt.id}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ description: "Updated", start_date: newDate });

    expect(res.status).toBe(206);
    expect(res.body).toHaveProperty("description", "Updated");
  });

  it("DELETE /api/appointments/delete/:id • existing appointment • returns 204 (no content)", async () => {
    const appt = await createAppointment({ user_id: user.id, service_id: service.id });

    const res = await getTestAgent()
      .delete(`/api/appointments/delete/${appt.id}`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(204);
  });
});
