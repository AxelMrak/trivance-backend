import { getTestAgent } from "@test/setup";
import { createUser } from "@test/utils/factories";
import { generateToken } from "@test/utils/helpers";
import { UserRole } from "@/entities/User";

describe("Clients normalization - standalone clients and linking on signup", () => {
  it("manager can create client without user", async () => {
    const manager = await createUser({ /* role column removed, using pivot */ });
    const token = generateToken(manager.id, UserRole.MANAGER);

    const res = await getTestAgent()
      .post("/clients/create")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Cliente Test", email: "cliente@test.com", phone: "1122334455", address: "Av. Siempre Viva 123" });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty("id");
    expect(res.body).toHaveProperty("user_id", null);
  });

  it("signup links existing client by email to the new user", async () => {
    const admin = await createUser({});
    const token = generateToken(admin.id, UserRole.MANAGER);
    const email = `linkme_${Date.now()}@client.com`;

    // create standalone client
    const createClientRes = await getTestAgent()
      .post("/clients/create")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Cliente Link", email, phone: "1100000000", address: "Calle Falsa 123" });
    expect(createClientRes.status).toBe(201);
    const clientId = createClientRes.body.id;

    // signup user with same email
    const signupRes = await getTestAgent().post("/auth/sign-up").send({
      name: "User Client",
      email,
      password: "password123",
      confirmedPassword: "password123",
      phone: "1100000000",
      address: "Calle Falsa 123",
    });
    expect(signupRes.status).toBe(200);

    // fetch client and verify user_id linked
    const getClientRes = await getTestAgent()
      .get(`/clients/get/${clientId}`)
      .set("Authorization", `Bearer ${token}`);
    expect(getClientRes.status).toBe(200);
    expect(getClientRes.body.user_id).toBeTruthy();
  });
});

