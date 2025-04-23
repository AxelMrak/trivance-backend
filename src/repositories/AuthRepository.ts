import { supabase } from "../config/supabase";
import { CreateUserDTO } from "../entities/User";
import { BaseRepository } from "./BaseRepository";
import { User } from "@supabase/supabase-js";

export class AuthRepository extends BaseRepository<User> {
  constructor() {
    super("users");
  }

  async signUp(payload: CreateUserDTO): Promise<any> {
    try {
      const { data, error } = await supabase.auth.signUp(payload);
      if (error) {
        throw new Error(error.message);
      }
      return data;
    } catch (error) {
      console.error("Error signing up:", error);
      throw error;
    }
  }
  async signIn(email: string, password: string): Promise<any> {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) {
      throw new Error(error.message);
    }
    return data;
  } catch (error) {
    console.error("Error signing in:", error);
    throw error;
  }
}

}
