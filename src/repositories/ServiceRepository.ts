import { Service } from "@entities/Service";
import { Db } from "@/config/db";
import { BaseRepository } from "@repositories/BaseRepository";

export class ServiceRepository extends BaseRepository<Service> {
  constructor(db: Db) {
    super(db, "services");
  }

  async searchByTerm(companyId: string, like: string, limit: number): Promise<any[]> {
    const { rows } = await this.db.query(
      "SELECT id, name, description FROM services WHERE company_id = $1 AND ($2 = '%%' OR name ILIKE $2 OR description ILIKE $2) ORDER BY name LIMIT $3",
      [companyId, like, limit],
    );
    return rows;
  }

  async findByIds(ids: string[]): Promise<any[]> {
    const { rows } = await this.db.query("SELECT * FROM services WHERE id = ANY($1::uuid[])", [
      ids,
    ]);
    return rows;
  }
}
