import fs from "fs";
import path from "path";
import * as yaml from "js-yaml";

/**
 * T-007 — PostgreSQL Port Isolation
 * The production Docker Compose stack MUST NOT expose PostgreSQL port 5432
 * to the host machine. The db service must not declare a `ports` mapping.
 *
 * Spec scenarios: Port 5432 not accessible from host.
 */
describe("docker-compose.yml port isolation #security-middleware", () => {
  const composePath = path.resolve(__dirname, "../../../../docker-compose.yml");
  let compose: any;

  beforeAll(() => {
    const raw = fs.readFileSync(composePath, "utf8");
    compose = yaml.load(raw, { schema: yaml.JSON_SCHEMA } as any);
  });

  it("parses the compose file at the repo root", () => {
    expect(compose).toBeDefined();
    expect(compose.services).toBeDefined();
    expect(compose.services["trivance-db"]).toBeDefined();
  });

  it("db service • does NOT publish port 5432 to the host", () => {
    const dbService = compose.services["trivance-db"];
    expect(dbService.ports).toBeUndefined();
  });
});
