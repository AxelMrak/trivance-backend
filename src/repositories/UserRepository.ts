import { supabase } from "../config/supabase";
import { BaseRepository } from "./BaseRepository";
import { User } from "@supabase/supabase-js";

export class UserRepository extends BaseRepository<User> {
  constructor() {
    super("users");
  }

  async findById(id: string): Promise<any> {
    const { data, error } = await supabase.auth.admin.getUserById(id);
    console.log("User data:", error);
    if (error) throw new Error(error.message);
    return data;
  }
}
