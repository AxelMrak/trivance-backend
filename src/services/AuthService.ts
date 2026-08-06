import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

import { AuthRepository } from "@repositories/AuthRepository";
import { PublicUserDTO, UserRole } from "@entities/User";
import { ClientsRepository } from "@/repositories/ClientsRepository";
import { SessionRepository } from "@/repositories/SessionRepository";
import { SignInResponse } from "@entities/Response";
import { SignupRequest } from "@entities/Request";
import { RoleService } from "@/services/RoleService";
import { config } from "@/config/constants";

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
      throw new Error("Este usuario ya existe");
    }

    const hashedPassword = await bcrypt.hash(payload.password, 10);
    const companyId = process.env.COMPANY_ID || "";
    if (!companyId) {
      throw new Error("El ID de la empresa no está configurado");
    }
    const userRole = UserRole.CLIENT;

    const user = await this.repository.create({
      company_id: companyId,
      name: payload.name,
      email: payload.email,
      phone: payload.phone,
      address: payload.address,
      password: hashedPassword,
    });

    if (!user) {
      throw new Error("Error al crear usuario");
    }

    // attach role in pivot
    const roleSvc = new RoleService();
    await roleSvc.assignRole(user.id, Number(userRole));
    const level = (await roleSvc.getRoleLevelForUser(user.id)) ?? Number(userRole);
    const token = this.generateToken(user.id, level);
    await this.sessionRepo.create({
      user_id: user.id,
      token,
      user_agent: userAgent,
      ip_address: ipAddress,
    });

    // Link existing client by email (if present and not linked)
    try {
      const clientsRepo = new ClientsRepository();
      const client = await clientsRepo.findByEmail(payload.email, companyId);
      if (client) {
        const updates: any = { user_id: client.user_id ?? user.id };
        if (!client.name) updates.name = payload.name;
        if (!client.email) updates.email = payload.email;
        if (!client.phone) updates.phone = payload.phone;
        if (!client.address) updates.address = payload.address;
        await clientsRepo.update(client.id, updates);
      }
    } catch {}

    return this.buildResponse({ ...user, role: level } as any, token);
  }

  async signIn(
    email: string,
    password: string,
    userAgent: string,
    ipAddress: string,
  ): Promise<SignInResponse> {
    const user = await this.repository.findByField("email", email);
    if (!user) throw new Error("El usuario no existe");

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) throw new Error("Contraseña inválida");

    const roleSvc = new RoleService();
    const level = (await roleSvc.getRoleLevelForUser(user.id)) ?? UserRole.GUEST;
    const token = this.generateToken(user.id, level);
    await this.sessionRepo.create({
      user_id: user.id,
      token,
      user_agent: userAgent,
      ip_address: ipAddress,
    });

    return this.buildResponse({ ...user, role: level } as any, token);
  }

  async signOut(token: string): Promise<void> {
    const session = await this.sessionRepo.findByField("token", token);
    if (!session) {
      throw new Error("Sesión no encontrada");
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
    return jwt.sign({ userId, role }, config.JWT_SECRET, { expiresIn: "24h" });
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
