import { Pool, PoolClient } from "pg";

import { config } from "@config/constants";

/**
 * Anything that can run queries: the shared pool or a single pooled client
 * checked out inside a transaction. Keep the surface minimal so both the
 * pool and a transaction client satisfy it.
 */
export type Db = Pick<Pool, "query"> | Pick<PoolClient, "query">;

export const dbClient = new Pool({
  connectionString: config.DB_URL,
  max: process.env.NODE_ENV === "test" ? 1 : undefined,
});

/**
 * Runs `work` inside a single transaction on one pooled client.
 *
 * Contract: the work callback MUST NOT perform external calls (HTTP, provider
 * APIs, email) — a connection is held open for the whole callback. Keep local
 * mutations only; external side effects must happen before or after the
 * transaction commits.
 */
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