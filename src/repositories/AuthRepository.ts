import { User } from "@entities/User";
import { Db } from "@/config/db";
import { BaseRepository } from "@repositories/BaseRepository";

export class AuthRepository extends BaseRepository<User> {
  constructor(db: Db) {
    super(db, "users");
  }
}
