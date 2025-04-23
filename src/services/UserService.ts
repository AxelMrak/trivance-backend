import { UserRepository } from "../repositories/UserRepository";
import { User } from "@supabase/supabase-js";

export class UserService {
  constructor(private repository: UserRepository) {}

  async getUsers(): Promise<User[]> {
    return this.repository.findAll();
  }
}
