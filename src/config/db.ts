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

export async function transaction<T>(work: (db: Db) => Promise<T>): Promise<T> {
  const client = await dbClient.connect();
  let rollbackError: unknown;
  try {
    await client.query("BEGIN");
    const result = await work(client);
    await client.query("COMMIT");
    return result;
  } catch (cause) {
    try {
      await client.query("ROLLBACK");
    } catch (rollbackCause) {
      rollbackError = rollbackCause;
    }
    throw cause;
  } finally {
    client.release(rollbackError as Error | undefined);
  }
}
