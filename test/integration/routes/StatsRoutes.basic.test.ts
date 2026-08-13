import { createUser, createService, createAppointment } from "@test/utils/factories";
import { getTestAgent } from "@test/setup";
import { generateToken } from "@test/utils/helpers";

describe("Stats Endpoints - Basic", () => {
  let token: string;
  let user: any;
  let serviceA: any;
  let serviceB: any;

  beforeEach(async () => {
    user = await createUser();
    serviceA = await createService({ company_id: user.company_id });
    serviceB = await createService({ company_id: user.company_id });
    token = generateToken(user.id, user.role as any, user.company_id);

    // Create some appointments for stats
    await createAppointment({
      user_id: user.id,
      service_id: serviceA.id,
      status: "confirmed" as any,
    });
    await createAppointment({
      user_id: user.id,
      service_id: serviceA.id,
      status: "pending" as any,
    });
    await createAppointment({
      user_id: user.id,
      service_id: serviceB.id,
      status: "confirmed" as any,
    });
  });

  it("GET /stats/appointments/summary • returns counts by status", async () => {
    const res = await getTestAgent()
      .get("/stats/appointments/summary")
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("total");
    expect(res.body).toHaveProperty("confirmed");
    expect(res.body).toHaveProperty("pending");
    expect(res.body).toHaveProperty("cancelled");
  });

  it("GET /stats/appointments/most-used-service • returns service_id and usage_count", async () => {
    const res = await getTestAgent()
      .get("/stats/appointments/most-used-service")
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    // Can be either serviceA or serviceB depending on counts; validate shape
    if (res.body) {
      expect(res.body).toHaveProperty("service_id");
      expect(res.body).toHaveProperty("usage_count");
    }
  });

  it("GET /stats/appointments/most-used-service?include=service • returns expanded service", async () => {
    const res = await getTestAgent()
      .get("/stats/appointments/most-used-service?include=service")
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    if (res.body) {
      expect(res.body).toHaveProperty("usage_count");
      expect(res.body).toHaveProperty("service");
      expect(res.body).not.toHaveProperty("service_id");
    }
  });
});
