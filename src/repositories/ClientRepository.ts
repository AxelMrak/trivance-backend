import { BaseRepository } from "@repositories/BaseRepository";
import { User } from "@entities/User";
import { dbClient } from "@/config/db";

export class ClientRepository extends BaseRepository<User> {
  constructor() {
    super("users");
  }

  async findClientsByRole(roleLevel: number): Promise<User[]> {
    try {
      const query = `
        SELECT u.*
        FROM clients c
        JOIN users u ON u.id = c.user_id
        JOIN user_roles ur ON ur.user_id = u.id
        WHERE ur.role_level = $1
      `;
      const result = await dbClient.query(query, [roleLevel]);
      return result.rows;
    } catch (_e) {
      // Fallback to users table when pivots are not available
      const fallback = await this.findWithCondition("role = $1", [roleLevel]);
      return fallback as any;
    }
  }

  async findClientByIdAndRole(id: string, roleLevel: number): Promise<User | null> {
    try {
      const query = `
        SELECT u.*
        FROM clients c
        JOIN users u ON u.id = c.user_id
        JOIN user_roles ur ON ur.user_id = u.id
        WHERE u.id = $1 AND ur.role_level = $2
      `;
      const result = await dbClient.query(query, [id, roleLevel]);
      return result.rows[0] || null;
    } catch (_e) {
      return this.findOneWithConditions(["id = $1", "role = $2"], [id, roleLevel]);
    }
  }
}
