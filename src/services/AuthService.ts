import { AuthRepository } from "@repositories/AuthRepository";
import { CreateUserDTO, PublicUserDTO } from "@entities/User";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

interface SignInResponse {
  user: PublicUserDTO;
  session: {
    token: string;
    expiresIn: number;
  };
}

export class AuthService {
  constructor(private repository: AuthRepository) {}

  async signUp(payload: CreateUserDTO): Promise<string | null> {
    console.log("Payload", payload);
    return "";
  }

  async signIn(email: string, password: string): Promise<SignInResponse> {
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
}
