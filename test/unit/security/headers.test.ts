import { getTestAgent } from "@test/setup";

/**
 * T-002 — Helmet Security Headers
 * The system MUST mount helmet default security middleware in the Express
 * pipeline on startup so every HTTP response includes security headers.
 *
 * Spec scenario: Security headers present on response (200 and 404).
 */
describe("Helmet security headers #security-middleware", () => {
  it("200 response • includes nosniff, SAMEORIGIN and referrer-policy headers", async () => {
    const res = await getTestAgent().get("/health").expect(200);

    expect(res.headers["x-content-type-options"]).toBe("nosniff");
    expect(res.headers["x-frame-options"]).toBe("SAMEORIGIN");
    expect(res.headers["referrer-policy"]).toBe("strict-origin-when-cross-origin");
  });

  it("404 response • includes the same security headers", async () => {
    const res = await getTestAgent().get("/this-route-does-not-exist").expect(404);

    expect(res.headers["x-content-type-options"]).toBe("nosniff");
    expect(res.headers["x-frame-options"]).toBe("SAMEORIGIN");
    expect(res.headers["referrer-policy"]).toBe("strict-origin-when-cross-origin");
  });
});
