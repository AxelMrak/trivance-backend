import { User } from "@entities/User";
import { BaseRepository } from "@repositories/BaseRepository";

export class AuthRepository extends BaseRepository<User> {
  constructor() {
    super("users");
  }
}
