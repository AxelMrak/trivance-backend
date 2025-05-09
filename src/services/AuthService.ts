import { AuthRepository } from "@repositories/AuthRepository";
import { CreateUserDTO, PublicUserDTO } from "@entities/User";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { SessionRepository } from "@/repositories/SessionRepository";

interface SignInResponse {
  user: PublicUserDTO;
  session: {
    token: string;
    expiresIn: number;
  };
}

export class AuthService {
  constructor(
    private repository: AuthRepository,
    private sessionRepo: SessionRepository,
  ) {} //TODO: fix any type
  async signUp(payload: any): Promise<SignInResponse | null> {
    const userExists = await this.repository.findByField("email", payload.email);
    if (userExists) {
      throw new Error("User already exists");
    }

    const hashedPassword = await bcrypt.hash(payload.password, 10);

    const user = await this.repository.create({
      company_id: payload.company_id,
      name: payload.name,
      email: payload.email,
      phone: payload.phone,
      address: payload.address,
      role: payload.role,
      password: hashedPassword,
    });

    if (!user) {
      throw new Error("Error creating user");
    }

    const token = jwt.sign({ userId: user.id, role: user.role }, process.env.JWT_SECRET!, {
      expiresIn: "24h",
    });

    const data: SignInResponse = {
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

    return data;
  }

  async signIn(
    email: string,
    password: string,
    user_agent: string,
    ip_address: string,
  ): Promise<SignInResponse> {
    const user = await this.repository.findByField("email", email);
    if (!user) {
      throw new Error("The user does not exist");
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      throw new Error("Invalid password");
    }

    const token = jwt.sign({ userId: user.id, role: user.role }, process.env.JWT_SECRET!, {
      expiresIn: "24h",
    });
    await this.sessionRepo.create({
      user_id: user.id,
      token,
      user_agent,
      ip_address,
    });

    const data: SignInResponse = {
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

    return data;
  }

  async signOut(token: string): Promise<void> {
    const session = await this.sessionRepo.findByField("token", token);
    if (!session) {
      throw new Error("Session not found");
    }
    await this.sessionRepo.delete(session.id);
  }
}
