import request from "supertest";
import app from "../src/app";

describe("GET /users", () => {
  it("should return 200 and users", async () => {
    const res = await request(app).get("/api/users/get-all");
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });
});
