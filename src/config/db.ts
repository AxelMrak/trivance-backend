import { Pool, PoolClient } from "pg";

import { config } from "@config/constants";

export type Db = Pool | PoolClient;

export const dbClient = new Pool({
  connectionString: config.DB_URL,
  max: process.env.NODE_ENV === "test" ? 1 : undefined,
});

export async function transaction<T>(work: (db: Db) => Promise<T>): Promise<T> {
  const client = await dbClient.connect();
  try {
    await client.query("BEGIN");
    const result = await work(client);
    await client.query("COMMIT");
    return result;
  } catch (cause) {
    await client.query("ROLLBACK").catch(() => {});
    throw cause;
  } finally {
    client.release();
  }
}
