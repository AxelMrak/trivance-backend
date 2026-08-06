import { UserRepository } from "@repositories/UserRepository";
import { PublicUserDTO } from "@entities/User";

export class UserService {
  constructor(private repository: UserRepository) {}

  async getUsers(): Promise<PublicUserDTO[]> {
    return this.repository.findAll();
  }

  async getUserByID(id: string): Promise<PublicUserDTO | null> {
    return this.repository.findById(id);
  }
}
