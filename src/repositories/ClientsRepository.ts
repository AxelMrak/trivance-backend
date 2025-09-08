import { dbClient } from "@/config/db";

export interface ClientEntity {
  id: string;
  company_id: string | null;
  user_id: string | null;
  name: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  created_at: Date;
  updated_at: Date;
}

export class ClientsRepository {
  private table = "clients";

  async findAll(): Promise<ClientEntity[]> {
    const { rows } = await dbClient.query(`SELECT * FROM ${this.table} ORDER BY created_at DESC`);
    return rows;
  }

  async findById(id: string): Promise<ClientEntity | null> {
    const { rows } = await dbClient.query(`SELECT * FROM ${this.table} WHERE id = $1`, [id]);
    return rows[0] || null;
  }

  async findByEmail(email: string, companyId?: string): Promise<ClientEntity | null> {
    if (companyId) {
      const { rows } = await dbClient.query(
        `SELECT * FROM ${this.table} WHERE email = $1 AND company_id = $2 LIMIT 1`,
        [email, companyId],
      );
      return rows[0] || null;
    }
    const { rows } = await dbClient.query(
      `SELECT * FROM ${this.table} WHERE email = $1 ORDER BY created_at DESC LIMIT 1`,
      [email],
    );
    return rows[0] || null;
  }

  async create(data: Partial<ClientEntity>): Promise<ClientEntity> {
    const keys = Object.keys(data);
    const columns = keys.map((k) => k).join(", ");
    const placeholders = keys.map((_, i) => `$${i + 1}`).join(", ");
    const values = Object.values(data);
    const { rows } = await dbClient.query(
      `INSERT INTO ${this.table} (${columns}) VALUES (${placeholders}) RETURNING *`,
      values,
    );
    return rows[0];
  }

  async update(id: string, data: Partial<ClientEntity>): Promise<ClientEntity | null> {
    const keys = Object.keys(data);
    if (keys.length === 0) return this.findById(id);
    const setClause = keys.map((k, i) => `${k} = $${i + 1}`).join(", ");
    const values = [...Object.values(data), id];
    const { rows } = await dbClient.query(
      `UPDATE ${this.table} SET ${setClause} WHERE id = $${keys.length + 1} RETURNING *`,
      values,
    );
    return rows[0] || null;
  }

  async delete(id: string): Promise<boolean> {
    const { rowCount } = await dbClient.query(`DELETE FROM ${this.table} WHERE id = $1`, [id]);
    return (rowCount ?? 0) > 0;
  }
}
