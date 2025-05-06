import { User, CreateUserDTO } from "@entities/User";
import { BaseRepository } from "@repositories/BaseRepository";
export class AuthRepository extends BaseRepository<User> {
  constructor() {
    super("users");
  }
  async signUp(payload: CreateUserDTO): Promise<any> {
    try {
      console.log("Signing up with payload:", payload);
    } catch (error) {
      console.error("Error signing up:", error);
      throw error;
    }
  }
  async signIn(email: string, password: string): Promise<any> {
    try {
      console.log("Signing in with email:", email, "and password :", password);
    } catch (error) {
      console.error("Error signing in:", error);
    }
  }
}
