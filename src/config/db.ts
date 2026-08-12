import { Pool, PoolClient } from "pg";

import { config } from "@config/constants";

export type Db = Pool | PoolClient;

export const dbClient = new Pool({
  connectionString: config.DB_URL,
  max: process.env.NODE_ENV === "test" ? 1 : undefined,
});

export async function transaction<T>(work: (db: Db) => Promise<T>): Promise<T> {
  const client = await dbClient.connect();
  // Captured for the finally block: a connection whose ROLLBACK failed must be
  // destroyed, not returned to the pool with an open transaction.
  let rollbackError: unknown;
  try {
    await client.query("BEGIN");
    const result = await work(client);
    await client.query("COMMIT");
    return result;
  } catch (cause) {
    // Attempt rollback even when COMMIT itself failed, so the connection is
    // never returned to the pool inside an open transaction.
    try {
      await client.query("ROLLBACK");
    } catch (rollbackCause) {
      rollbackError = rollbackCause;
    }
    throw cause;
  } finally {
    // Passing the rollback error to release() tells pg to DESTROY the client
    // instead of returning it to the pool: a connection whose ROLLBACK failed
    // may still hold an open transaction, and reusing it would corrupt the
    // next unit of work.
    client.release(rollbackError as Error | undefined);
  }
}
