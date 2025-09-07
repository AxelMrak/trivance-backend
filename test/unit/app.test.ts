import { getTestAgent } from "@test/setup";

/**
 * This file contains basic health check tests for the application.
 * It tests the /health and /api endpoints.
 */
describe("GET /health #cold", () => {
  /**
   * Test case for the /health endpoint.
   * It checks if the server is running and returns a 200 status code.
   */
  it("Health endpoint • when called • returns 200 and status OK", async () => {
    const res = await getTestAgent().get("/health").send();

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("status", "OK");
  });
});

describe("GET /api #cold", () => {
  /**
   * Test case for the /api endpoint.
   * It checks if the API is running and returns a 200 status code.
   */
  it("API root • when called • returns 200 and status OK", async () => {
    const res = await getTestAgent().get("/api").send();

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("status", "OK");
  });
});
