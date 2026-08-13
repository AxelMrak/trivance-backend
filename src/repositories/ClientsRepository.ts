import { dbClient } from "@/config/db";

export interface ClientEntity {
  id: string;
  company_id: string | null;
  user_id: string | null;
  name: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
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

  async isLinkedToUser(clientId: string, userId: string): Promise<boolean> {
    const { rows } = await dbClient.query(
      "SELECT 1 FROM clients WHERE id = $1 AND user_id = $2 LIMIT 1",
      [clientId, userId],
    );
    return (rows?.length ?? 0) > 0;
  }

  async getWithUser(clientId: string): Promise<any | null> {
    const { rows } = await dbClient.query(
      `SELECT c.*, u.id as u_id, u.name as u_name, u.email as u_email, u.phone as u_phone, u.address as u_address
       FROM clients c
       LEFT JOIN users u ON u.id = c.user_id
       WHERE c.id = $1`,
      [clientId],
    );
    return rows[0] || null;
  }

  async getUserIdByClientId(clientId: string): Promise<string | null> {
    const { rows } = await dbClient.query("SELECT user_id FROM clients WHERE id = $1", [clientId]);
    return (rows[0]?.user_id as string | undefined) ?? null;
  }

  async findIdByClientId(clientId: string): Promise<string | null> {
    const { rows } = await dbClient.query("SELECT id FROM clients WHERE id = $1", [clientId]);
    return (rows[0]?.id as string | undefined) ?? null;
  }

  async findIdByUserId(userId: string): Promise<string | null> {
    const { rows } = await dbClient.query("SELECT id FROM clients WHERE user_id = $1", [userId]);
    return (rows[0]?.id as string | undefined) ?? null;
  }
}
