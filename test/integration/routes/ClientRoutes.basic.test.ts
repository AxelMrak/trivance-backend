import { createClient, createUser } from "@test/utils/factories";
import { getTestAgent } from "@test/setup";
import { generateToken } from "@test/utils/helpers";
import { UserRole } from "@/entities/User";

describe("Clients Endpoints - Basic", () => {
  let token: string;
  let authUser: any;

  beforeEach(async () => {
    authUser = await createUser();
    token = generateToken(authUser.id, authUser.role as any, authUser.company_id);
  });

  it("GET  /clients/getAll • returns 200 and array", async () => {
    await createUser({ role: UserRole.CLIENT, company_id: authUser.company_id });
    await createUser({ role: UserRole.CLIENT, company_id: authUser.company_id });

    const res = await getTestAgent().get("/clients/getAll").set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThanOrEqual(2);
  });

  it("GET  /clients/get/:id • existing client • returns 200 with entity", async () => {
    const { client } = await createClient({ company_id: authUser.company_id });

    const res = await getTestAgent()
      .get(`/clients/get/${client.id}`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("id", client.id);
  });

  it("PUT  /clients/update/:id • updates allowed fields • returns 200", async () => {
    const { client } = await createClient({ company_id: authUser.company_id });
    const res = await getTestAgent()
      .put(`/clients/update/${client.id}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Updated Client" });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("name", "Updated Client");
  });

  it("DELETE /clients/delete/:id • existing client • returns 204 (no content)", async () => {
    const { client } = await createClient({ company_id: authUser.company_id });
    const res = await getTestAgent()
      .delete(`/clients/delete/${client.id}`)
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(204);
    expect(res.body).toEqual({});
  });
});
