import request from "supertest";

import app from "../src/app";

const mockUser = {
  name: "John Doe",
  email: "test@gmail.com",
  password: "password",
  companyID: "1234567890",
};

describe("Create user test", () => {
  it("Responds with a new user", (done) => {
    request(app)
      .post("/api/users/new-user")
      .set("Accept", "application/json")
      .send(mockUser)
      .expect("Content-Type", /json/)
      .expect(
        201,
        {
          user: {
            ...mockUser, // SPREAD OPERATOR. TRAEMOS LAS PROPIEDADES DEL OBJETO DECLARADO ARRIBA
            id: expect.any(String),
            role: expect.any(Number),
          },
        },
        done,
      );
  });
});

describe("GET /", () => {
  it("responds with a json message", (done) => {
    request(app)
      .get("/")
      .set("Accept", "application/json")
      .expect("Content-Type", /json/)
      .expect(
        200,
        {
          message: {
            text: "API - 👋🌎🌍🌏",
            url: "/",
          },
        },
        done,
      );
  });
});
