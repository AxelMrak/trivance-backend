import { dbClient } from "@/config/db";
import {
  generateGetAllQuery,
  generateGetByIdQuery,
  generateCreateQuery,
  generateUpdateQuery,
  generateDeleteQuery,
  generateFindByFieldQuery,
} from "@queries/BaseQueries";

export class BaseRepository<T> {
  protected table: string;

  constructor(table: string) {
    this.table = table;
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
}
