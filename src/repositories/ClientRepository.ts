import { BaseRepository } from "@repositories/BaseRepository";
import { User } from "@entities/User";

export class ClientRepository extends BaseRepository<User> {
  constructor() {
    super("users");
  }
}
