import { AuthService } from "@services/AuthService";
import { AuthRepository } from "@repositories/AuthRepository";
import { SessionRepository } from "@repositories/SessionRepository";
import { createUser } from "../factories";
import { User } from "@/entities/User";

/**
 * This file contains integration tests for the AuthService.
 * It tests the signIn method of the AuthService.
 */
describe("AuthService - signIn", () => {
  const repository = new AuthRepository();
  const sessionRepository = new SessionRepository();
  const service = new AuthService(repository, sessionRepository);

  const USER_AGENT = "jest-agent";
  const IP = "127.0.0.1";

  let user: User;
  let plainPassword: any;

  /**
   * Before each test, we create a new user using the createUser factory.
   * This ensures that each test starts with a clean slate.
   */
  beforeEach(async () => {
    user = await createUser();
    plainPassword = (user as any).plainPassword;
  });

  /**
   * Test case for authenticating a valid user.
   * It checks if the signIn method returns the correct user and session information.
   */
  it("authenticates a valid user", async () => {
    const result = await service.signIn(user.email, plainPassword, USER_AGENT, IP);

    expect(result).toBeDefined();
    expect(result.user).toBeDefined();
    expect(result.user.email).toBe(user.email);
    expect(result.session).toBeDefined();
    expect(result.session.token).toBeTruthy();
    expect(result.session.expiresIn).toBeGreaterThan(0);
  });

  /**
   * Test case for rejecting a user with an incorrect password.
   * It checks if the signIn method throws an error when the password is incorrect.
   */
  it("rejects when password is incorrect", async () => {
    await expect(service.signIn(user.email, "wrongpassword", USER_AGENT, IP)).rejects.toThrow(
      "Contraseña inválida",
    );
  });

  /**
   * Test case for rejecting a user that does not exist.
   * It checks if the signIn method throws an error when the user does not exist.
   */
  it("rejects when user does not exist", async () => {
    await expect(
      service.signIn("nonexistent@example.com", "somepassword", USER_AGENT, IP),
    ).rejects.toThrow("El usuario no existe");
  });
});

