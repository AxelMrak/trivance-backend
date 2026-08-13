import { dbClient } from "@/config/db";
import { handleDatabaseError } from "@/errors/persistenceErrors";
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
      handleDatabaseError(error);
    }
  }

  async findOneWithConditions(whereClauses: string[], values: any[] = []): Promise<T | null> {
    try {
      const whereClause = whereClauses.join(" AND ");
      const query = `SELECT * FROM ${this.table} WHERE ${whereClause}`;
      const result = await dbClient.query(query, values);
      if (result.rowCount === 0) {
        return null;
      }
      return result.rows[0] || null;
    } catch (error) {
      handleDatabaseError(error);
    }
  }

  async findManyByField(field: string, value: any): Promise<T[]> {
    return this.findWithCondition(`${field} = $1`, [value]);
  }

  async existsById(id: string): Promise<boolean> {
    try {
      const query = `SELECT 1 FROM ${this.table} WHERE id = $1 LIMIT 1`;
      const result = await dbClient.query(query, [id]);
      return (result.rowCount ?? 0) > 0;
    } catch (error) {
      handleDatabaseError(error);
    }
  }

  async existsByField(field: string, value: any): Promise<boolean> {
    try {
      const query = `SELECT 1 FROM ${this.table} WHERE ${field} = $1 LIMIT 1`;
      const result = await dbClient.query(query, [value]);
      return (result.rowCount ?? 0) > 0;
    } catch (error) {
      handleDatabaseError(error);
    }
  }

  async findAll(): Promise<T[]> {
    try {
      const query = generateGetAllQuery(this.table);
      const result = await dbClient.query(query);
      return result.rows;
    } catch (error) {
      handleDatabaseError(error);
    }
  }

  async findById(id: string): Promise<T | null> {
    try {
      const query = generateGetByIdQuery(this.table);
      const result = await dbClient.query(query, [id]);
      return result.rows[0] || null;
    } catch (error) {
      handleDatabaseError(error);
    }
  }

  async findByCompanyId(companyId: string): Promise<T[]> {
    try {
      const query = generateGetByCompanyIdQuery(this.table);
      const result = await dbClient.query(query, [companyId]);
      return result.rows;
    } catch (error) {
      handleDatabaseError(error);
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
      handleDatabaseError(error);
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
      handleDatabaseError(error);
    }
  }

  async delete(id: string): Promise<number | string | null> {
    try {
      const query = generateDeleteQuery(this.table);
      const result = await dbClient.query(query, [id]);
      return result.rows[0]?.id || null;
    } catch (error) {
      handleDatabaseError(error);
    }
  }

  async findByField(field: string, value: string): Promise<T | null> {
    try {
      const query = generateFindByFieldQuery(this.table, field);
      const result = await dbClient.query(query, [value]);
      return result.rows[0] || null;
    } catch (error) {
      handleDatabaseError(error);
    }
  }

  async deleteByField(field: string, value: string): Promise<number | string | null> {
    try {
      const query = generateDeleteByFieldQuery(this.table, field);
      const result = await dbClient.query(query, [value]);
      return result.rows[0]?.id || null;
    } catch (error) {
      handleDatabaseError(error);
    }
  }

  async deleteAllbyField(field: string, value: string): Promise<number | string | null> {
    try {
      const query = `DELETE FROM ${this.table} WHERE ${field} = $1 RETURNING id`;
      const result = await dbClient.query(query, [value]);
      return result.rows[0]?.id || null;
    } catch (error) {
      handleDatabaseError(error);
    }
  }
}
