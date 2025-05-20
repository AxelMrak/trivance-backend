import { BaseRepository } from "@repositories/BaseRepository";
import { User, UserRole } from "@entities/User";

export class UserRepository extends BaseRepository<User> {
  constructor() {
    super("users");
  }
  async findAllClients(): Promise<User[]> {
    return this.findWithCondition("role = $1", [UserRole.CLIENT]);
  }

  async findClientsByCompanyId(companyId: string): Promise<User[]> {
    return this.findWithCondition("company_id = $1 AND role = $2", [companyId, UserRole.CLIENT]);
  }
}
