import { BaseRepository } from "./BaseRepository";
import { User } from "@supabase/supabase-js";

export class UserRepository extends BaseRepository<User> {
  constructor() {
    super("users");
  }
}
