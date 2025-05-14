export const generateGetAllQuery = (table: string): string => {
  return `SELECT * FROM ${table}`;
};

export const generateGetByIdQuery = (table: string): string => {
  return `SELECT * FROM ${table} WHERE id = $1`;
};

export const generateGetByCompanyIdQuery = (table: string): string => {
  return `SELECT * FROM ${table} WHERE company_id = $1`;
};

export const generateCreateQuery = (table: string, columns: string[]): string => {
  const columnNames = columns.join(", ");
  const placeholders = columns.map((_, index) => `$${index + 1}`).join(", ");
  return `INSERT INTO ${table} (${columnNames}) VALUES (${placeholders}) RETURNING *`;
};

export const generateUpdateQuery = (table: string, columns: string[]): string => {
  const setClause = columns.map((col, index) => `${col} = $${index + 1}`).join(", ");
  return `UPDATE ${table} SET ${setClause} WHERE id = $${columns.length + 1} RETURNING *`;
};

export const generateDeleteQuery = (table: string): string => {
  return `DELETE FROM ${table} WHERE id = $1 RETURNING id`;
};

export const generateCountQuery = (table: string): string => {
  return `SELECT COUNT(*) FROM ${table}`;
};

export const generateFindByFieldQuery = (table: string, field: string): string => {
  return `SELECT * FROM ${table} WHERE ${field} = $1`;
};
export const generateDeleteByFieldQuery = (table: string, field: string): string => {
  return `DELETE FROM ${table} WHERE ${field} = $1 RETURNING id`;
};
