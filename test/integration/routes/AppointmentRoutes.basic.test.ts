import { createUser, createService, createAppointment } from "@test/utils/factories";
import { getTestAgent } from "@test/setup";
import { generateToken } from "@test/utils/helpers";
import { UserRole } from "@/entities/User";

describe("Appointments Endpoints - Basic", () => {
  let token: string;
  let user: any;
  let service: any;

  beforeEach(async () => {
    user = await createUser();
    service = await createService({ company_id: user.company_id, requires_deposit: false });
    token = generateToken(user.id, user.role as any);
  });

  it("POST  /appointments/create • valid payload without deposit • returns 201 confirmed", async () => {
    const start = new Date(Date.now() + 60 * 60 * 1000).toISOString();

    const res = await getTestAgent()
      .post("/appointments/create")
      .set("Authorization", `Bearer ${token}`)
      .send({ service_id: service.id, start_date: start, description: "Test" });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty("id");
    expect(res.body).toHaveProperty("service_id", service.id);
    expect(res.body).toHaveProperty("user_id", user.id);
    expect(res.body).toHaveProperty("status", "confirmed");
  });

  it("POST  /appointments/create • invalid payload • returns 400 with message", async () => {
    const res = await getTestAgent()
      .post("/appointments/create")
      .set("Authorization", `Bearer ${token}`)
      .send({ service_id: "", start_date: "not-a-date" });

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty("message");
  });

  it("POST /appointments/create • invalid service_id • returns 400 with message", async () => {
    const start = new Date(Date.now() + 60 * 60 * 1000).toISOString();

    const res = await getTestAgent()
      .post("/appointments/create")
      .set("Authorization", `Bearer ${token}`)
      .send({ service_id: "non-existent-id", start_date: start });

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty("message");
  });

  it("GET  /appointments/getAll • user has appointments • returns 200 and array", async () => {
    await createAppointment({ user_id: user.id, service_id: service.id });
    await createAppointment({ user_id: user.id, service_id: service.id });

    const res = await getTestAgent()
      .get("/appointments/getAll")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThanOrEqual(2);
    if (res.body.length > 0) {
      expect(res.body[0]).toHaveProperty("service_id");
      expect(res.body[0]).toHaveProperty("user_id");
    }
  });

  it("GET  /appointments/getAll?include=service • returns list with service included", async () => {
    await createAppointment({ user_id: user.id, service_id: service.id });
    const res = await getTestAgent()
      .get("/appointments/getAll?include=service")
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    if (res.body.length > 0) {
      expect(res.body[0]).toHaveProperty("service");
      expect(res.body[0]).not.toHaveProperty("service_id");
      expect(res.body[0].service).toHaveProperty("id");
    }
  });

  it("GET  /appointments/getAll?include=user • returns list with user included (no password)", async () => {
    await createAppointment({ user_id: user.id, service_id: service.id });
    const res = await getTestAgent()
      .get("/appointments/getAll?include=user")
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    if (res.body.length > 0) {
      expect(res.body[0]).toHaveProperty("user");
      expect(res.body[0]).not.toHaveProperty("user_id");
      expect(res.body[0].user).toHaveProperty("id");
      expect(res.body[0].user).not.toHaveProperty("password");
    }
  });

  it("GET  /appointments/get/:id • existing appointment • returns 200 with entity", async () => {
    const appt = await createAppointment({ user_id: user.id, service_id: service.id });

    const res = await getTestAgent()
      .get(`/appointments/get/${appt.id}`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("id", appt.id);
  });

  it("GET  /appointments/get/:id?include=service • includes service object", async () => {
    const appt = await createAppointment({ user_id: user.id, service_id: service.id });

    const res = await getTestAgent()
      .get(`/appointments/get/${appt.id}?include=service`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("id", appt.id);
    expect(res.body).toHaveProperty("service");
    expect(res.body).not.toHaveProperty("service_id");
    expect(res.body.service).toHaveProperty("id", service.id);
  });

  it("GET  /appointments/get/:id?include=user • includes user object without password", async () => {
    const appt = await createAppointment({ user_id: user.id, service_id: service.id });

    const res = await getTestAgent()
      .get(`/appointments/get/${appt.id}?include=user`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("id", appt.id);
    expect(res.body).toHaveProperty("user");
    expect(res.body).not.toHaveProperty("user_id");
    expect(res.body.user).toHaveProperty("id", user.id);
    expect(res.body.user).not.toHaveProperty("password");
  });

  it("GET  /appointments/get/:id?include=service,user • includes both objects", async () => {
    const appt = await createAppointment({ user_id: user.id, service_id: service.id });

    const res = await getTestAgent()
      .get(`/appointments/get/${appt.id}?include=service,user`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("service");
    expect(res.body).toHaveProperty("user");
    expect(res.body).not.toHaveProperty("service_id");
    expect(res.body).not.toHaveProperty("user_id");
  });

  it("GET  /appointments/:id?include=service,user • RESTful alias includes both objects", async () => {
    const appt = await createAppointment({ user_id: user.id, service_id: service.id });

    const res = await getTestAgent()
      .get(`/appointments/${appt.id}?include=service,user`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("id", appt.id);
    expect(res.body).toHaveProperty("service");
    expect(res.body).toHaveProperty("user");
    expect(res.body).not.toHaveProperty("service_id");
    expect(res.body).not.toHaveProperty("user_id");
  });

  it("PUT  /appointments/update/:id • valid changes • returns 200 with updated fields", async () => {
    const appt = await createAppointment({ user_id: user.id, service_id: service.id });
    const newDate = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString();

    const res = await getTestAgent()
      .put(`/appointments/update/${appt.id}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ description: "Updated", start_date: newDate });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("description", "Updated");
  });

  it("PUT  /appointments/update/:id • client cannot change status • returns 403", async () => {
    const client = await createUser({ role: UserRole.CLIENT, company_id: user.company_id });
    const clientToken = generateToken(client.id, client.role as any);
    const appt = await createAppointment({ user_id: client.id, service_id: service.id });
    const res = await getTestAgent()
      .put(`/appointments/update/${appt.id}`)
      .set("Authorization", `Bearer ${clientToken}`)
      .send({ status: "confirmed" });
    expect(res.status).toBe(403);
  });

  it("PUT  /appointments/update/:id • staff can change status for own appointment • returns 200", async () => {
    const staff = await createUser({ role: UserRole.STAFF, company_id: user.company_id });
    const staffToken = generateToken(staff.id, staff.role as any);
    const appt = await createAppointment({ user_id: staff.id, service_id: service.id });

    const res = await getTestAgent()
      .put(`/appointments/update/${appt.id}`)
      .set("Authorization", `Bearer ${staffToken}`)
      .send({ status: "confirmed" });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("status", "confirmed");
  });

  it("PUT  /appointments/update/:id • staff cannot change status for others' appointment • returns 403", async () => {
    const staff = await createUser({ role: UserRole.STAFF, company_id: user.company_id });
    const staffToken = generateToken(staff.id, staff.role as any);
    const appt = await createAppointment({ user_id: user.id, service_id: service.id });

    const res = await getTestAgent()
      .put(`/appointments/update/${appt.id}`)
      .set("Authorization", `Bearer ${staffToken}`)
      .send({ status: "cancelled" });

    expect(res.status).toBe(403);
  });

  it("DELETE  /appointments/delete/:id • existing appointment • returns 204 (no content)", async () => {
    const appt = await createAppointment({ user_id: user.id, service_id: service.id });

    const res = await getTestAgent()
      .delete(`/appointments/delete/${appt.id}`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(204);
  });

  it("POST  /appointments/payment/{id}/link • existing appointment • returns 200 with payment link", async () => {
    const appt = await createAppointment({ user_id: user.id, service_id: service.id });

    const res = await getTestAgent()
      .post(`/appointments/payment/${appt.id}/link/`)
      .set("Authorization", `Bearer ${token}`)
      .send();

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("paymentLink");
  });
});
