import { createUser } from "@test/utils/factories";
import { getTestAgent } from "@test/setup";

describe("Users Endpoints - Basic", () => {
  it("GET  /users/getAll • returns 200 and array", async () => {
    await createUser();
    await createUser();

    const res = await getTestAgent().get("/users/getAll");
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThanOrEqual(2);
  });

  it("GET  /users/get/:id • existing user • returns 200 with entity", async () => {
    const user = await createUser();
    const res = await getTestAgent().get(`/users/get/${user.id}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("id", user.id);
  });
});

