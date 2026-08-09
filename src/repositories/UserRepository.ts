import { BaseRepository } from "@repositories/BaseRepository";
import { PublicUserDTO } from "@entities/User";
import { dbClient } from "@config/db";
import { handleDatabaseError } from "@/errors/persistenceErrors";

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
  constructor() {
    super("users");
  }

  async findAll(): Promise<PublicUserDTO[]> {
    try {
      const query = `
        SELECT ${PUBLIC_USER_PROJECTION}
        FROM users u
        LEFT JOIN user_roles ur ON ur.user_id = u.id
      `;
      const result = await dbClient.query(query);
      return result.rows;
    } catch (error) {
      handleDatabaseError(error);
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
      const result = await dbClient.query(query, [id]);
      return result.rows[0] || null;
    } catch (error) {
      handleDatabaseError(error);
    }
  }
}
