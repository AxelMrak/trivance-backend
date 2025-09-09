import { dbClient } from "@/config/db";

export class RoleService {
  // Returns numeric level (0..5) where higher = more privileges
  async getRoleLevelForUser(userId: string): Promise<number | null> {
    try {
      const query = `
        SELECT ur.role_level as level
        FROM user_roles ur
        WHERE ur.user_id = $1
        LIMIT 1
      `;
      const result = await dbClient.query(query, [userId]);
      if (result.rowCount && result.rows[0]) return Number(result.rows[0].level);
    } catch (_e) {
      // Table may not exist yet; fall back to users.role
      try {
        const fallback = await dbClient.query("SELECT role FROM users WHERE id = $1", [userId]);
        if (fallback.rowCount && fallback.rows[0]) return Number(fallback.rows[0].role);
      } catch {
        return null;
      }
    }
    return null;
  }

  async assignRole(userId: string, level: number): Promise<void> {
    try {
      await dbClient.query(
        `INSERT INTO user_roles (user_id, role_level) VALUES ($1, $2)
         ON CONFLICT (user_id) DO UPDATE SET role_level = EXCLUDED.role_level`,
        [userId, level],
      );
    } catch {
      // ignore assignment if pivot not present
    }
  }
}
