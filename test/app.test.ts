import app from "@/app";
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

describe("GET /api", () => {
  it("Get API health", (done) => {
    request(app).get("/api").set("Accept", "application/json").expect(
      200,
      {
        message: "API is running",
        status: "OK",
      },
      done,
    );
  });
});
