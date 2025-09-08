import { createUser, createService } from "@test/utils/factories";
import { getTestAgent } from "@test/setup";
import { signInAndGetToken } from "@test/utils/helpers";

describe("Services Endpoints - Basic", () => {
  let token: string;
  let user: any;

  beforeEach(async () => {
    user = await createUser();
    token = await signInAndGetToken(user.email, (user as any).plainPassword);
  });

  it.skip("POST  /services/create • valid payload • returns 201 with entity", async () => {
    const res = await getTestAgent()
      .post("/services/create")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "S1", description: "Descripcion larga", price: 10, duration: "01:00:00" });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty("id");
    expect(res.body).toHaveProperty("name", "S1");
  });

  it("GET  /services/getAll • returns 200 and array", async () => {
    await createService({ company_id: user.company_id });
    await createService({ company_id: user.company_id });

    const res = await getTestAgent()
      .get("/services/getAll")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it("GET  /services/get/:id • existing service • returns 200 with entity", async () => {
    const svc = await createService({ company_id: user.company_id });
    const res = await getTestAgent()
      .get(`/services/get/${svc.id}`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("id", svc.id);
  });

  it.skip("PUT  /services/update/:id • valid changes • returns 200 with updated fields", async () => {
    const svc = await createService({ company_id: user.company_id });
    const res = await getTestAgent()
      .put(`/services/update/${svc.id}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "S2", description: "Descripcion actualizada", price: 15, duration: "02:00:00" });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("name", "S2");
  });

  it("DELETE /services/delete/:id • existing service • returns 204 (no content)", async () => {
    const svc = await createService({ company_id: user.company_id });

    const res = await getTestAgent()
      .delete(`/services/delete/${svc.id}`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(204);
    expect(res.body).toEqual({});
  });
});
