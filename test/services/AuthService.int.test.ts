import { AuthService } from "@services/AuthService";
import { AuthRepository } from "@repositories/AuthRepository";
import { dbClient } from "@config/db";
import bcrypt from "bcryptjs";

const repository = new AuthRepository();
const service = new AuthService(repository);
const testUser = {
  company_id: "22222222-2222-2222-2222-222222222222",
  name: "Test User",
  email: "test@example.com",
  password: bcrypt.hashSync("testpass123", 10),
  phone: "1234567890",
  address: "123 Street",
  role: "CLIENT",
};

describe("AuthService - signIn", () => {
  beforeEach(async () => {
    await dbClient.query(
      `
      INSERT INTO users (
        company_id, name, email, password, phone, address, role
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8
      )
    `,
      [
        testUser.company_id,
        testUser.name,
        testUser.email,
        testUser.password,
        testUser.phone,
        testUser.address,
        testUser.role,
      ],
    );
  });

  it("should authenticate a valid user", async () => {
    const result = await service.signIn("test@example.com", "testpass123");

    expect(result).toHaveProperty("user.email", "test@example.com");
    expect(result.session.token).toBeDefined();
    expect(result.session.expiresIn).toBeGreaterThan(0);
  });

  it("should throw if password is incorrect", async () => {
    await expect(service.signIn("test@example.com", "wrongpassword")).rejects.toThrow(
      "Invalid password",
    );
  });

  it("should throw if user does not exist", async () => {
    await expect(service.signIn("nonexistent@example.com", "testpass123")).rejects.toThrow(
      "The user does not exist",
    );
  });
});
