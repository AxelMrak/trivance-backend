import app from "../src/app";
import request from "supertest";

describe("GET /health", () => {
  it("Get server health", (done) => {
    request(app)
      .get("/health")
      .set("Accept", "application/json")
      .expect("Content-Type", /json/)
      .expect(
        200,
        {
          message: "Server is running",
          status: "OK",
        },
        done,
      );
  });
});
