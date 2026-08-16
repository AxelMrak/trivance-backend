import { Pool, PoolClient } from "pg";

import { Db } from "@/config/db";

export interface PaymentWebhookEvent {
  id: string;
  provider: string;
  payment_id: string;
  payload: unknown;
  status: "pending" | "processed" | "dead_letter";
  attempts: number;
  max_attempts: number;
  available_at: string;
  last_error: string | null;
  processed_at: string | null;
  created_at: string;
}

export interface PaymentWebhookEventInsert {
  provider: string;
  payment_id: string;
  payload: unknown;
}

const CLAIM_QUERY = `
  SELECT *
  FROM payment_webhook_events
  WHERE status = 'pending' AND available_at <= now()
  ORDER BY created_at
  FOR UPDATE SKIP LOCKED
  LIMIT $1
`;

export class PaymentWebhookEventRepository {
  constructor(private db: Pool) {}

  async insert(data: PaymentWebhookEventInsert): Promise<PaymentWebhookEvent | undefined> {
    const result = await this.db.query(
      `INSERT INTO payment_webhook_events (provider, payment_id, payload)
       VALUES ($1, $2, $3)
       ON CONFLICT (provider, payment_id) DO UPDATE
         SET status = 'pending',
             available_at = now(),
             attempts = 0,
             last_error = NULL
       WHERE payment_webhook_events.status IN ('processed', 'dead_letter')
       RETURNING *`,
      [data.provider, data.payment_id, data.payload],
    );
    return result.rows[0];
  }

  /**
   * Claims due rows inside a transaction so the FOR UPDATE SKIP LOCKED row
   * locks are held until `work` marks them (markProcessed/markRetry/
   * markDeadLetter on the same client). One row that fails to process never
   * aborts the whole batch unless a DB statement on this connection errors.
   */
  async claimDue(
    work: (events: PaymentWebhookEvent[], client: PoolClient) => Promise<void>,
    limit = 10,
  ): Promise<PaymentWebhookEvent[]> {
    const client = await this.db.connect();
    let rollbackError: unknown;
    try {
      await client.query("BEGIN");
      const result = await client.query(CLAIM_QUERY, [limit]);
      const events = result.rows as PaymentWebhookEvent[];
      await work(events, client);
      await client.query("COMMIT");
      return events;
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

  async markProcessed(id: string, db?: Db): Promise<void> {
    const executor = db ?? this.db;
    await executor.query(
      `UPDATE payment_webhook_events
       SET status = 'processed', processed_at = now()
       WHERE id = $1`,
      [id],
    );
  }

  async markRetry(
    id: string,
    attempts: number,
    availableAt: Date,
    lastError: string,
    db?: Db,
  ): Promise<void> {
    const executor = db ?? this.db;
    await executor.query(
      `UPDATE payment_webhook_events
       SET status = 'pending', attempts = $2, available_at = $3, last_error = $4
       WHERE id = $1`,
      [id, attempts, availableAt, lastError],
    );
  }

  async markDeadLetter(id: string, lastError: string, db?: Db): Promise<void> {
    const executor = db ?? this.db;
    await executor.query(
      `UPDATE payment_webhook_events
       SET status = 'dead_letter', last_error = $2
       WHERE id = $1`,
      [id, lastError],
    );
  }
}
