import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

import { AuthRepository } from "@repositories/AuthRepository";
import { PublicUserDTO, UserRole } from "@entities/User";
import { SessionRepository } from "@/repositories/SessionRepository";
import { SignInResponse } from "@entities/Response";
import { SignupRequest } from "@entities/Request";

export class AuthService {
  constructor(
    private repository: AuthRepository,
    private sessionRepo: SessionRepository,
  ) {}

  async signUp(
    payload: SignupRequest,
    userAgent: string,
    ipAddress: string,
  ): Promise<SignInResponse | null> {
    const userExists = await this.repository.findByField("email", payload.email);
    if (userExists) {
      throw new Error("User already exists");
    }

    const hashedPassword = await bcrypt.hash(payload.password, 10);
    const companyId = process.env.COMPANY_ID || "";
    if (!companyId) {
      throw new Error("Company ID is not set");
    }
    const userRole = UserRole.GUEST;

    const user = await this.repository.create({
      company_id: companyId,
      name: payload.name,
      email: payload.email,
      phone: payload.phone,
      address: payload.address,
      role: Number(userRole),
      password: hashedPassword,
    });

    if (!user) {
      throw new Error("Error creating user");
    }

    const token = this.generateToken(user.id, user.role);
    await this.sessionRepo.create({
      user_id: user.id,
      token,
      user_agent: userAgent,
      ip_address: ipAddress,
    });

    return this.buildResponse(user, token);
  }

  async signIn(
    email: string,
    password: string,
    userAgent: string,
    ipAddress: string,
  ): Promise<SignInResponse> {
    const user = await this.repository.findByField("email", email);
    if (!user) throw new Error("The user does not exist");

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) throw new Error("Invalid password");

    const token = this.generateToken(user.id, user.role);
    await this.sessionRepo.create({
      user_id: user.id,
      token,
      user_agent: userAgent,
      ip_address: ipAddress,
    });

    return this.buildResponse(user, token);
  }

  async signOut(token: string): Promise<void> {
    const session = await this.sessionRepo.findByField("token", token);
    if (!session) {
      throw new Error("Session not found");
    }
    await this.sessionRepo.delete(session.id);
  }
  async getUserById(id: string): Promise<PublicUserDTO | null> {
    const user = await this.repository.findByField("id", id);
    if (!user) return null;
  
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      address: user.address,
      role: user.role,
      company_id: user.company_id,
      created_at: user.created_at,
      updated_at: user.updated_at,
    };
  }
  
  private generateToken(userId: string, role: number): string {
    return jwt.sign({ userId, role }, process.env.JWT_SECRET!, { expiresIn: "24h" });
  }

  /**
   * PENDING: Uncomment this method when the session management is implemented
  private async terminateUserSessions(userId: string): Promise<void> {
    await this.sessionRepo.deleteAllbyField("user_id", userId);
  }
 */

  private buildResponse(user: PublicUserDTO, token: string): SignInResponse {
    return {
      user: {
        id: user.id,
        company_id: user.company_id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        address: user.address,
        role: user.role,
        created_at: user.created_at,
        updated_at: user.updated_at,
      },
      session: {
        token,
        expiresIn: 24 * 60 * 60,
      },
    };
  }
}
