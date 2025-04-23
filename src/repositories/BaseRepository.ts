import { supabase } from "../config/supabase";

export class BaseRepository<T> {
  protected table: string;

  constructor(table: string) {
    this.table = table;
  }
  async findAll(): Promise<T[]> {
    const { data, error } = await supabase.from(this.table).select("*");
    if (error) throw new Error(error.message);
    return data as T[];
  }

  async findById(id: string): Promise<T | null> {
    const { data, error } = await supabase.from(this.table).select("*").eq("id", id).single();
    if (error) throw new Error(error.message);
    return data as T;
  }
}
