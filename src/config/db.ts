import { Pool, PoolClient } from "pg";

import { config } from "@config/constants";

export type Db = Pool | PoolClient;

export const dbClient = new Pool({
  connectionString: config.DB_URL,
  connectionTimeoutMillis: 5000,
  max: process.env.NODE_ENV === "test" ? 1 : undefined,
});

dbClient.on("error", (err) => {
  console.error("Postgres pool error:", err.message);
});

export async function transaction<T>(work: (db: Db) => Promise<T>, client?: Db): Promise<T> {
  // The caller (e.g. the payment webhook outbox worker) already manages the
  // transaction on this connection, so run the work directly on it.
  if (client) return work(client);
  const conn = await dbClient.connect();
  let rollbackError: unknown;
  try {
    await conn.query("BEGIN");
    const result = await work(conn);
    await conn.query("COMMIT");
    return result;
  } catch (cause) {
    try {
      await conn.query("ROLLBACK");
    } catch (rollbackCause) {
      rollbackError = rollbackCause;
    }
    throw cause;
  } finally {
    conn.release(rollbackError as Error | undefined);
  }
}
