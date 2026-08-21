import { AppointmentRepository } from "@/repositories/AppointmentRepository";
import { OrderRepository } from "@/repositories/OrderRepository";
import { PaymentEventRepository } from "@/repositories/PaymentEventRepository";
import { PaymentProvider, PaymentData, PaymentStatus } from "@/entities/PaymentProvider";
import { AppointmentStatus, OrderStatus } from "@/entities/EnumTypes";
import { toCents } from "@/utils/money";
import { logger } from "@/utils/logger";
import { transaction } from "@/config/db";
import { isProduction } from "@/config/env";

export type WebhookResult =
  | { status: "processed" }
  | { status: "already_processed" }
  | { status: "ignored"; reason: string };

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

  private async recordEvent(data: {
    payment_id: string;
    order_id?: string;
    event: string;
    status?: PaymentStatus;
    raw?: PaymentData;
    reason?: string;
  }): Promise<void> {
    // TODO(jrz-errors): cuando jerez mergee su PR de errores de persistencia,
    // el unique violation de payment_events.payment_id (SQLSTATE 23505) se
    // mapea a ConflictError con code "UNIQUE_VIOLATION" en persistenceErrors.
    // Volver acá y detectar el duplicado con ese mecanismo en vez del
    // check-then-rethrow actual, que no depende del refactor de errores.
    try {
      await this.paymentEventRepository.insert(data);
    } catch (error) {
      const existing = await this.paymentEventRepository.findByPaymentId(data.payment_id);
      if (!existing) throw error;
    }
  }

  async processWebhook(body: MercadoPagoWebhookBody): Promise<WebhookResult> {
    if (body.type !== "payment") {
      return { status: "ignored", reason: "not_payment" };
    }

    const payment = await this.provider.getPayment(body.data.id);
    if (!payment) {
      await this.recordEvent({
        payment_id: String(body.data.id),
        event: "payment_not_found",
      });
      return { status: "ignored", reason: "payment_not_found" };
    }

    if (payment.liveMode !== isProduction) {
      await this.recordEvent({
        payment_id: payment.id,
        event: "live_mode_mismatch",
        status: payment.status,
        raw: payment,
      });
      return { status: "ignored", reason: "live_mode_mismatch" };
    }

    const order = await this.orderRepository.findByReference(payment.externalReference);
    if (!order) {
      await this.recordEvent({
        payment_id: payment.id,
        event: "order_not_found",
        status: payment.status,
        raw: payment,
      });
      return { status: "ignored", reason: "order_not_found" };
    }

    const amountMatches =
      order.amount != null &&
      order.currency != null &&
      payment.transactionAmountCents === toCents(order.amount) &&
      payment.currencyId === order.currency;
    if (payment.externalReference !== order.reference_id || !amountMatches) {
      await this.recordEvent({
        payment_id: payment.id,
        order_id: order.id,
        event: "mismatch",
        status: payment.status,
        raw: payment,
        reason: "mismatch",
      });
      return { status: "ignored", reason: "mismatch" };
    }

    let outcome: { alreadyProcessed: boolean };
    try {
      outcome = await transaction(async (db) => {
        const existingEvent = await this.paymentEventRepository.findByPaymentId(payment.id, db);
        const transition = statusTransitions(payment.status);
        const currentOrder =
          existingEvent != null
            ? ((await this.orderRepository.findByReference(payment.externalReference, db)) ?? order)
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
            db,
          );
        }

        if (transition && currentOrder.status !== transition.orderStatus) {
          await this.orderRepository.update(order.id, { status: transition.orderStatus }, db);
          await this.appointmentRepository.update(
            order.appointment_id,
            { status: transition.appointmentStatus },
            db,
          );
        }

        return { alreadyProcessed: false };
      });
    } catch (error) {
      // TODO(jrz-errors): tras el merge del PR de errores de jerez, el unique
      // violation de payment_events (23505) se detecta como ConflictError con
      // code "UNIQUE_VIOLATION" (persistenceErrors). Volver acá y devolver
      // already_processed en ese caso, para que la idempotencia por duplicado
      // vuelva a funcionar sin depender del helper local.
      logger.error("Webhook transaction failed", error);
      throw error;
    }
    if (outcome.alreadyProcessed) {
      return { status: "already_processed" };
    }

    return { status: "processed" };
  }
}
