import { User } from "@supabase/supabase-js";
import { AuthRepository } from "../repositories/AuthRepository";
import { CreateUserDTO } from "../entities/User";
export class AuthService {
  constructor(private repository: AuthRepository) {}

  async signUp(payload: CreateUserDTO): Promise<User> {
    return this.repository.signUp(payload);
  }
  async signIn(email: string, password: string): Promise<any> {
  return this.repository.signIn(email, password);
}
}
