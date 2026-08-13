import { createUser } from "@test/utils/factories";
import { getTestAgent } from "@test/setup";
import { generateToken } from "@test/utils/helpers";
import { UserRole } from "@entities/User";

describe("Users Endpoints - Basic", () => {
  it.each(["/users/getAll", "/users/get/non-existent-id"])(
    "GET %s without a token returns 401",
    async (path) => {
      const res = await getTestAgent().get(path);

      expect(res.status).toBe(401);
    },
  );

  it.each(["/users/getAll", "/users/get/%s"])(
    "GET %s with a role below MANAGER returns 403",
    async (path) => {
      const user = await createUser({ role: UserRole.STAFF });
      const resolvedPath = path.includes("%s") ? path.replace("%s", user.id) : path;
      const token = generateToken(user.id, UserRole.STAFF, user.company_id);

      const res = await getTestAgent().get(resolvedPath).set("Authorization", `Bearer ${token}`);

      expect(res.status).toBe(403);
    },
  );

  it("GET /users/getAll with MANAGER or higher returns public users", async () => {
    const manager = await createUser({ role: UserRole.MANAGER });
    // Factories create separate companies; tenancy isolation is out of this fix's scope.
    await createUser({ role: UserRole.STAFF });
    const token = generateToken(manager.id, UserRole.MANAGER, manager.company_id);

    const res = await getTestAgent().get("/users/getAll").set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body).toEqual(
      expect.arrayContaining([expect.objectContaining({ id: manager.id, role: UserRole.MANAGER })]),
    );
    for (const user of res.body) {
      expect(user).not.toHaveProperty("password");
    }
  });

  it("GET /users/get/:id with MANAGER or higher returns a public user", async () => {
    const manager = await createUser({ role: UserRole.MANAGER });
    // The target belongs to another factory-created company by design; this endpoint is not tenant-isolated yet.
    const target = await createUser({ role: UserRole.ADMIN });
    const token = generateToken(manager.id, UserRole.MANAGER, manager.company_id);

    const res = await getTestAgent()
      .get(`/users/get/${target.id}`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ id: target.id, role: UserRole.ADMIN });
    expect(res.body).not.toHaveProperty("password");
  });
});
