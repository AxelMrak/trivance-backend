import { dbClient } from "@/config/db";

export class ClientsPivotRepository {
  private table = "clients";

  async createIfNotExists(userId: string): Promise<void> {
    await dbClient.query(
      `INSERT INTO ${this.table} (user_id) VALUES ($1)
       ON CONFLICT (user_id) DO NOTHING`,
      [userId],
    );
  }
}

