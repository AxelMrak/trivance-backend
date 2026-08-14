import { BaseRepository } from "@/repositories/BaseRepository";
import { Db } from "@/config/db";
import { generateCreateQuery } from "@/queries/BaseQueries";

export interface PaymentEvent {
  id: string;
  payment_id: string;
  order_id: string | null;
  event: string;
  status?: string | null;
  raw?: unknown | null;
  reason?: string | null;
  created_at: string;
}

export interface PaymentEventInsert {
  payment_id: string;
  order_id?: string | null;
  event: string;
  status?: string;
  raw?: unknown;
  reason?: string;
}

export class PaymentEventRepository extends BaseRepository<PaymentEvent> {
  constructor(db: Db) {
    super(db, "payment_events");
  }

  async insert(data: PaymentEventInsert, db?: Db): Promise<PaymentEvent> {
    const executor = db ?? this.db;
    const query = generateCreateQuery(this.table, Object.keys(data));
    const result = await executor.query(query, Object.values(data));
    return result.rows[0];
  }

  async findByPaymentId(paymentId: string, db?: Db): Promise<PaymentEvent | undefined> {
    const executor = db ?? this.db;
    const result = await executor.query("SELECT * FROM payment_events WHERE payment_id = $1", [
      paymentId,
    ]);
    return result.rows[0] ?? undefined;
  }
}
