import { getTestAgent } from "@test/setup";
import { createService, createUser } from "@test/utils/factories";
import { generateToken } from "@test/utils/helpers";
import { UserRole } from "@/entities/User";

describe("Search endpoints", () => {
  it("finds services of the authenticated user company", async () => {
    const manager = await createUser();
    const token = generateToken(manager.id, UserRole.MANAGER, manager.company_id);
    const service = await createService({
      company_id: manager.company_id,
      name: "Corte Especial Test",
    });

    const res = await getTestAgent()
      .get("/search/global?q=Corte")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.some((r: any) => r.type === "Servicio" && r.title === service.name)).toBe(true);
  });

  it("returns empty when nothing matches", async () => {
    const manager = await createUser();
    const token = generateToken(manager.id, UserRole.MANAGER, manager.company_id);

    const res = await getTestAgent()
      .get("/search/global?q=zzzznope")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });
});
