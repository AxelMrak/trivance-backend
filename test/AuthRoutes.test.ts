import request from "supertest";
import app from "../src/app";
import { randomEmail, randomName, randomPhone } from "../src/utils/randomGenerators";

describe("POST /sign-in", () => {
  it("should return 200 and the signed-in user data", async () => {
    const res = await request(app)
      .post("/api/auth/sign-in")
      .send({
        email: "nahuposebon@gmail.com",
        password: "12345678" 
      });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("user");
    expect(res.body.user).toHaveProperty("id","78e7e44e-02b9-406f-824f-6f3371dfe9df");
    expect(res.body.user).toHaveProperty("email", "nahuposebon@gmail.com");
    expect(res.body.session).toHaveProperty("access_token");
  });
});

describe("POST /sign-up", () => {
  it("should create a new user and return the same email", async () => {
    const email = randomEmail();
    const res = await request(app)
      .post("/api/auth/sign-up")
      .send({
        name: randomName(),
        email: email,
        password: "12345678",
        confirmedPassword: "12345678",
        phone: randomPhone(),

        options: {
          data: {
            company_id: "6e1e163a-3d02-4b84-9feb-72e85e4e68b2",
            role: 0
          }
        }
      });
    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty("user");
    expect(res.body.user).toHaveProperty("email", email);
  });
});

