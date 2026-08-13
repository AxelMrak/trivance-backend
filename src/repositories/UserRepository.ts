import { BaseRepository } from "@repositories/BaseRepository";
import { PublicUserDTO } from "@entities/User";
import { Db } from "@config/db";

const PUBLIC_USER_PROJECTION = `
  u.id,
  u.company_id,
  u.name,
  u.email,
  u.phone,
  u.address,
  COALESCE(ur.role_level, 0) AS role,
  u.created_at,
  u.updated_at
`;

export class UserRepository extends BaseRepository<PublicUserDTO> {
  constructor(db: Db) {
    super(db, "users");
  }

  async findAll(): Promise<PublicUserDTO[]> {
    try {
      const query = `
        SELECT ${PUBLIC_USER_PROJECTION}
        FROM users u
        LEFT JOIN user_roles ur ON ur.user_id = u.id
      `;
      const result = await this.db.query(query);
      return result.rows;
    } catch (_error) {
      throw new Error("Error de base de datos");
    }
  }

  async findById(id: string): Promise<PublicUserDTO | null> {
    try {
      const query = `
        SELECT ${PUBLIC_USER_PROJECTION}
        FROM users u
        LEFT JOIN user_roles ur ON ur.user_id = u.id
        WHERE u.id = $1
      `;
      const result = await this.db.query(query, [id]);
      return result.rows[0] || null;
    } catch (_error) {
      throw new Error("Error de base de datos");
    }
  }

  async findPublicByIds(ids: string[]): Promise<any[]> {
    const { rows } = await this.db.query(
      "SELECT id, name, email, phone, address FROM users WHERE id = ANY($1::uuid[])",
      [ids],
    );
    return rows;
  }

  async findPublicById(id: string): Promise<any | null> {
    const { rows } = await this.db.query(
      "SELECT id, name, email, phone, address FROM users WHERE id = $1",
      [id],
    );
    return rows[0] || null;
  }

  async findRolesByUserIds(ids: string[]): Promise<Array<{ user_id: string; role_level: number }>> {
    const { rows } = await this.db.query(
      "SELECT user_id, role_level FROM user_roles WHERE user_id = ANY($1::uuid[])",
      [ids],
    );
    return rows;
  }
}
