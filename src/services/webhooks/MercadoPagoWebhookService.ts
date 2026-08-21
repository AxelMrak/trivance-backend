import { DatabaseError as PgDatabaseError, PoolClient } from "pg";

import { AppointmentRepository } from "@/repositories/AppointmentRepository";
import { OrderRepository } from "@/repositories/OrderRepository";
import { PaymentEventRepository } from "@/repositories/PaymentEventRepository";
import { PaymentProvider, PaymentData, PaymentStatus } from "@/entities/PaymentProvider";
import { AppointmentStatus, OrderStatus } from "@/entities/EnumTypes";
import { ConflictError } from "@/errors/httpErrors";
import { mapDatabaseError } from "@/errors/persistenceErrors";
import { toCents } from "@/utils/money";
import { logger } from "@/utils/logger";
import { Db, transaction } from "@/config/db";
import { isProduction } from "@/config/env";

function isPoolClient(db: Db | undefined): db is PoolClient {
  return db != null && "release" in db;
}

export type WebhookProcessResult =
  | { status: "processed" }
  | { status: "already_processed" }
  | { status: "retry"; reason: string } // transient — retry later
  | { status: "dead_letter"; reason: string } // permanent — do not retry
  | { status: "ignored"; reason: "not_payment" };

export interface MercadoPagoWebhookBody {
  type: string;
  data: { id: string };
}

function statusTransitions(
  status: PaymentStatus,
): { orderStatus: OrderStatus; appointmentStatus: AppointmentStatus } | null {
  switch (status) {
    case "approved":
      return { orderStatus: "paid", appointmentStatus: "confirmed" };
    case "rejected":
    case "refused":
    case "cancelled":
      return { orderStatus: "cancelled", appointmentStatus: "cancelled" };
    case "chargeback":
      return { orderStatus: "failed", appointmentStatus: "cancelled" };
    default:
      return null;
  }
}

export class MercadoPagoWebhookService {
  constructor(
    private orderRepository: OrderRepository,
    private appointmentRepository: AppointmentRepository,
    private paymentEventRepository: PaymentEventRepository,
    private provider: PaymentProvider,
  ) {}

  private async recordEvent(
    data: {
      payment_id: string;
      order_id?: string;
      event: string;
      status?: PaymentStatus;
      raw?: PaymentData;
      reason?: string;
    },
    db?: Db,
  ): Promise<void> {
    // A duplicate insert (payment_events.payment_id unique) aborts the current
    // transaction. When running inside the outbox worker's shared claim
    // transaction (db = PoolClient), contain it in a savepoint so the
    // transaction stays usable after we swallow the benign duplicate.
    const client = isPoolClient(db) ? db : undefined;
    if (client) await client.query("SAVEPOINT record_event");
    try {
      await this.paymentEventRepository.insert(data, db);
    } catch (error) {
      if (client) await client.query("ROLLBACK TO SAVEPOINT record_event");
      if (error instanceof PgDatabaseError) {
        const mapped = mapDatabaseError(error);
        if (mapped instanceof ConflictError && mapped.code === "UNIQUE_VIOLATION") {
          return;
        }
      }
      throw error;
    } finally {
      if (client) await client.query("RELEASE SAVEPOINT record_event");
    }
  }

  async processWebhook(body: MercadoPagoWebhookBody, db?: Db): Promise<WebhookProcessResult> {
    if (body.type !== "payment") {
      return { status: "ignored", reason: "not_payment" };
    }

    const payment = await this.provider.getPayment(body.data.id);
    if (!payment) {
      await this.recordEvent(
        {
          payment_id: String(body.data.id),
          event: "payment_not_found",
        },
        db,
      );
      // Transient: MP may not have the payment queryable yet. The outbox worker
      // retries with backoff instead of losing the webhook.
      return { status: "retry", reason: "payment_not_found" };
    }

    if (payment.liveMode !== isProduction) {
      await this.recordEvent(
        {
          payment_id: payment.id,
          event: "live_mode_mismatch",
          status: payment.status,
          raw: payment,
        },
        db,
      );
      return { status: "dead_letter", reason: "live_mode_mismatch" };
    }

    const order = await this.orderRepository.findByReference(payment.externalReference, db);
    if (!order) {
      await this.recordEvent(
        {
          payment_id: payment.id,
          event: "order_not_found",
          status: payment.status,
          raw: payment,
        },
        db,
      );
      // Transient: the order may be created moments after the payment webhook.
      return { status: "retry", reason: "order_not_found" };
    }

    const amountMatches =
      order.amount != null &&
      order.currency != null &&
      payment.transactionAmountCents === toCents(order.amount) &&
      payment.currencyId === order.currency;
    if (payment.externalReference !== order.reference_id || !amountMatches) {
      await this.recordEvent(
        {
          payment_id: payment.id,
          order_id: order.id,
          event: "mismatch",
          status: payment.status,
          raw: payment,
          reason: "mismatch",
        },
        db,
      );
      // Permanent: the payment does not belong to this order. No point retrying.
      return { status: "dead_letter", reason: "mismatch" };
    }

    let outcome: { alreadyProcessed: boolean };
    try {
      outcome = await transaction(async (tx) => {
        const existingEvent = await this.paymentEventRepository.findByPaymentId(payment.id, tx);
        const transition = statusTransitions(payment.status);
        const currentOrder =
          existingEvent != null
            ? ((await this.orderRepository.findByReference(payment.externalReference, tx)) ?? order)
            : order;
        const alreadyApplied =
          existingEvent != null && (!transition || currentOrder.status === transition.orderStatus);
        if (alreadyApplied) {
          return { alreadyProcessed: true };
        }

        if (existingEvent == null) {
          await this.paymentEventRepository.insert(
            {
              payment_id: payment.id,
              order_id: order.id,
              event: "process",
              status: payment.status,
              raw: payment,
            },
            tx,
          );
        }

        if (transition && currentOrder.status !== transition.orderStatus) {
          await this.orderRepository.update(order.id, { status: transition.orderStatus }, tx);
          await this.appointmentRepository.update(
            order.appointment_id,
            { status: transition.appointmentStatus },
            tx,
          );
        }

        return { alreadyProcessed: false };
      }, db);
    } catch (error) {
      if (error instanceof PgDatabaseError) {
        const mapped = mapDatabaseError(error);
        if (mapped instanceof ConflictError && mapped.code === "UNIQUE_VIOLATION") {
          return { status: "already_processed" };
        }
      }
      logger.error("Webhook transaction failed", error);
      throw error;
    }
    if (outcome.alreadyProcessed) {
      return { status: "already_processed" };
    }

    return { status: "processed" };
  }
}
