import { UserRepository } from "../repositories/UserRepository";
import { User } from "@supabase/supabase-js";

export class UserService {
  constructor(private repository: UserRepository) {}

  async getUsers(): Promise<User[]> {
    return this.repository.findAll();
  }

  async getUserById(id: string): Promise<User | null> {
    return this.repository.findById(id);
  }
}
