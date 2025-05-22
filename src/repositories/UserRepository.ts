import { BaseRepository } from "@repositories/BaseRepository";
import { User, UserRole } from "@entities/User";

export class UserRepository extends BaseRepository<User> {
  constructor() {
    super("users");
  }
}
