import { UserRepository } from "../repositories/UserRepository";

export class UserService {
  constructor(private repository: UserRepository) {}

  async getUsers(): Promise<User[]> {
    return this.repository.findAll();
  }

  async getUserByID(id: string): Promise<User | null> {
    return this.repository.findById(id);
  }
}
