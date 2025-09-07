import { getTestAgent } from "./setup";

/**
 * This file contains basic health check tests for the application.
 * It tests the /health and /api endpoints.
 */
describe("GET /health", () => {
  /**
   * Test case for the /health endpoint.
   * It checks if the server is running and returns a 200 status code.
   */
  it("Get server health", async () => {
    const res = await getTestAgent().get("/health").send();

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      message: "Server is running",
      status: "OK",
    });
  });
});

describe("GET /api", () => {
  /**
   * Test case for the /api endpoint.
   * It checks if the API is running and returns a 200 status code.
   */
  it("Get API health", async () => {
    const res = await getTestAgent().get("/api").send();

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      message: "API is running",
      status: "OK",
    });
  });
});