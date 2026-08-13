import { Db } from "@/config/db";
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
  protected db: Db;

  protected table: string;

  constructor(db: Db, table: string) {
    this.db = db;
    this.table = table;
  }

  // TODO: IMPROVE ERROR HANDLING WITH BETTER MESSAGES AND REUSABLE ERRORS
  async findWithCondition(whereClause: string, values: any[] = [], db?: Db): Promise<T[]> {
    const executor = db ?? this.db;
    try {
      const query = `SELECT * FROM ${this.table} WHERE ${whereClause}`;
      const result = await executor.query(query, values);
      return result.rows;
    } catch (error) {
      throw new Error("Error de base de datos");
    }
  }

  async findOneWithConditions(
    whereClauses: string[],
    values: any[] = [],
    db?: Db,
  ): Promise<T | null> {
    const executor = db ?? this.db;
    try {
      const whereClause = whereClauses.join(" AND ");
      const query = `SELECT * FROM ${this.table} WHERE ${whereClause}`;
      const result = await executor.query(query, values);
      if (result.rowCount === 0) {
        throw new Error(
          `No se encontró ningún registro con las condiciones: ${whereClauses.join(", ")}`,
        );
      }
      return result.rows[0] || null;
    } catch (error) {
      throw new Error("Error de base de datos");
    }
  }

  async findManyByField(field: string, value: any, db?: Db): Promise<T[]> {
    return this.findWithCondition(`${field} = $1`, [value], db);
  }

  async existsById(id: string, db?: Db): Promise<boolean> {
    const executor = db ?? this.db;
    try {
      const query = `SELECT 1 FROM ${this.table} WHERE id = $1 LIMIT 1`;
      const result = await executor.query(query, [id]);
      return (result.rowCount ?? 0) > 0;
    } catch (_error) {
      throw new Error("Error de base de datos");
    }
  }

  async existsByField(field: string, value: any, db?: Db): Promise<boolean> {
    const executor = db ?? this.db;
    try {
      const query = `SELECT 1 FROM ${this.table} WHERE ${field} = $1 LIMIT 1`;
      const result = await executor.query(query, [value]);
      return (result.rowCount ?? 0) > 0;
    } catch (_error) {
      throw new Error("Error de base de datos");
    }
  }

  async findAll(db?: Db): Promise<T[]> {
    const executor = db ?? this.db;
    try {
      const query = generateGetAllQuery(this.table);
      const result = await executor.query(query);
      return result.rows;
    } catch (error) {
      throw new Error("Error de base de datos");
    }
  }

  async findById(id: string, db?: Db): Promise<T | null> {
    const executor = db ?? this.db;
    try {
      const query = generateGetByIdQuery(this.table);
      const result = await executor.query(query, [id]);
      return result.rows[0] || null;
    } catch (error) {
      throw new Error("Error de base de datos");
    }
  }

  async findByCompanyId(companyId: string, db?: Db): Promise<T[]> {
    const executor = db ?? this.db;
    try {
      const query = generateGetByCompanyIdQuery(this.table);
      const result = await executor.query(query, [companyId]);
      return result.rows;
    } catch (error) {
      throw new Error("Error de base de datos");
    }
  }

  async create(data: Partial<T>, db?: Db): Promise<T> {
    const executor = db ?? this.db;
    try {
      const columns = Object.keys(data);
      const query = generateCreateQuery(this.table, columns);
      const values = Object.values(data);
      const result = await executor.query(query, values);
      return result.rows[0];
    } catch (error) {
      throw new Error("Error de base de datos");
    }
  }

  async update(id: string, data: Partial<T>, db?: Db): Promise<T | null> {
    const executor = db ?? this.db;
    try {
      const columns = Object.keys(data);
      const query = generateUpdateQuery(this.table, columns);
      const values = [...Object.values(data), id];
      const result = await executor.query(query, values);
      return result.rows[0] || null;
    } catch (error) {
      throw new Error("Error de base de datos");
    }
  }

  async delete(id: string, db?: Db): Promise<number | string | null> {
    const executor = db ?? this.db;
    try {
      const query = generateDeleteQuery(this.table);
      const result = await executor.query(query, [id]);
      return result.rows[0]?.id || null;
    } catch (error) {
      throw new Error("Error de base de datos");
    }
  }

  async findByField(field: string, value: string, db?: Db): Promise<T | null> {
    const executor = db ?? this.db;
    try {
      const query = generateFindByFieldQuery(this.table, field);
      const result = await executor.query(query, [value]);
      return result.rows[0] || null;
    } catch (error) {
      throw new Error("Error de base de datos");
    }
  }

  async deleteByField(field: string, value: string, db?: Db): Promise<number | string | null> {
    const executor = db ?? this.db;
    try {
      const query = generateDeleteByFieldQuery(this.table, field);
      const result = await executor.query(query, [value]);
      return result.rows[0]?.id || null;
    } catch (error) {
      throw new Error("Error de base de datos");
    }
  }

  async deleteAllbyField(field: string, value: string, db?: Db): Promise<number | string | null> {
    const executor = db ?? this.db;
    try {
      const query = `DELETE FROM ${this.table} WHERE ${field} = $1 RETURNING id`;
      const result = await executor.query(query, [value]);
      return result.rows[0]?.id || null;
    } catch (error) {
      throw new Error("Error al eliminar registros");
    }
  }
}
