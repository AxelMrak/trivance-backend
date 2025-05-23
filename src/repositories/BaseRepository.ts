import { dbClient } from "@/config/db";
import {
  generateGetAllQuery,
  generateGetByIdQuery,
  generateCreateQuery,
  generateUpdateQuery,
  generateDeleteQuery,
  generateFindByFieldQuery,
  generateDeleteByFieldQuery,
  generateGetByCompanyIdQuery,
} from "@queries/BaseQueries";

export class BaseRepository<T> {
  protected table: string;

  constructor(table: string) {
    this.table = table;
  }

  async findWithCondition(whereClause: string, values: any[] = []): Promise<T[]> {
    try {
      const query = `SELECT * FROM ${this.table} WHERE ${whereClause}`;
      const result = await dbClient.query(query, values);
      return result.rows;
    } catch (error) {
      console.error(`Error fetching with condition from ${this.table}:`, error);
      throw new Error("Database error");
    }
  }

  async findOneWithConditions(whereClauses: string[], values: any[] = []): Promise<T | null> {
    try {
      const whereClause = whereClauses.join(" AND ");
      const query = `SELECT * FROM ${this.table} WHERE ${whereClause}`;
      const result = await dbClient.query(query, values);
      return result.rows[0] || null;
    } catch (error) {
      console.error(`Error fetching one with conditions from ${this.table}:`, error);
      throw new Error("Database error");
    }
  }

  async findAll(): Promise<T[]> {
    try {
      const query = generateGetAllQuery(this.table);
      const result = await dbClient.query(query);
      return result.rows;
    } catch (error) {
      console.error(`Error fetching all from ${this.table}:`, error);
      throw new Error("Database error");
    }
  }

  async findById(id: string): Promise<T | null> {
    try {
      const query = generateGetByIdQuery(this.table);
      const result = await dbClient.query(query, [id]);
      return result.rows[0] || null;
    } catch (error) {
      console.error(`Error fetching by ID from ${this.table}:`, error);
      throw new Error("Database error");
    }
  }

  async findByCompanyId(companyId: string): Promise<T[]> {
    try {
      const query = generateGetByCompanyIdQuery(this.table);
      const result = await dbClient.query(query, [companyId]);
      return result.rows;
    } catch (error) {
      console.error(`Error fetching by company ID from ${this.table}:`, error);
      throw new Error("Database error");
    }
  }

  async create(data: Partial<T>): Promise<T> {
    try {
      const columns = Object.keys(data);
      const query = generateCreateQuery(this.table, columns);
      const values = Object.values(data);
      const result = await dbClient.query(query, values);
      return result.rows[0];
    } catch (error) {
      console.error(`Error creating in ${this.table}:`, error);
      throw new Error("Database error");
    }
  }

  async update(id: string, data: Partial<T>): Promise<T | null> {
    try {
      const columns = Object.keys(data);
      const query = generateUpdateQuery(this.table, columns);
      const values = [...Object.values(data), id];
      const result = await dbClient.query(query, values);
      return result.rows[0] || null;
    } catch (error) {
      console.error(`Error updating in ${this.table}:`, error);
      throw new Error("Database error");
    }
  }

  async delete(id: string): Promise<number | string | null> {
    try {
      const query = generateDeleteQuery(this.table);
      const result = await dbClient.query(query, [id]);
      return result.rows[0]?.id || null;
    } catch (error) {
      console.error(`Error deleting from ${this.table}:`, error);
      throw new Error("Database error");
    }
  }

  async findByField(field: string, value: string): Promise<T | null> {
    try {
      const query = generateFindByFieldQuery(this.table, field);
      const result = await dbClient.query(query, [value]);
      return result.rows[0] || null;
    } catch (error) {
      console.error(`Error fetching by field from ${this.table}:`, error);
      throw new Error("Database error");
    }
  }

  async deleteByField(field: string, value: string): Promise<number | string | null> {
    try {
      const query = generateDeleteByFieldQuery(this.table, field);
      const result = await dbClient.query(query, [value]);
      return result.rows[0]?.id || null;
    } catch (error) {
      console.error(`Error deleting by field from ${this.table}:`, error);
      throw new Error("Database error");
    }
  }

  async deleteAllbyField(field: string, value: string): Promise<number | string | null> {
    try {
      const query = `DELETE FROM ${this.table} WHERE ${field} = $1 RETURNING id`;
      const result = await dbClient.query(query, [value]);
      return result.rows[0]?.id || null;
    } catch (error) {
      console.error(`Failed to delete all by ${field} in ${this.table}:`, error);
      throw new Error("Failed to delete records");
    }
  }
}
