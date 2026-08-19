import { PoolClient } from "pg";

import {
  PaymentWebhookEvent,
  PaymentWebhookEventRepository,
} from "@/repositories/PaymentWebhookEventRepository";
import {
  MercadoPagoWebhookBody,
  MercadoPagoWebhookService,
  WebhookProcessResult,
} from "@/services/webhooks/MercadoPagoWebhookService";
import { logger } from "@/utils/logger";

export const MAX_BACKOFF_MS = 5 * 60 * 1000;

/**
 * Exponential backoff base for a given attempt (1-based). Jitter is applied
 * by the worker when scheduling, so tests can assert the deterministic base.
 */
export function computeBackoff(attempt: number, baseMs: number): number {
  const backoff = baseMs * 2 ** (attempt - 1);
  return Math.min(backoff, MAX_BACKOFF_MS);
}

/** ±20% jitter around the computed backoff. */
function applyJitter(backoffMs: number): number {
  const jitter = backoffMs * 0.2 * (Math.random() * 2 - 1);
  return Math.max(0, backoffMs + jitter);
}

function toWebhookBody(event: PaymentWebhookEvent): MercadoPagoWebhookBody {
  const payload =
    typeof event.payload === "object" && event.payload !== null
      ? (event.payload as Record<string, unknown>)
      : {};
  const type = typeof payload.type === "string" ? payload.type : "payment";
  return { type, data: { id: event.payment_id } };
}

export interface PaymentWebhookWorkerOptions {
  intervalMs?: number;
  batchSize?: number;
  maxAttempts?: number;
  backoffBaseMs?: number;
  onDeadLetter?: (event: PaymentWebhookEvent) => void;
}

export class PaymentWebhookWorker {
  private readonly intervalMs: number;

  private readonly batchSize: number;

  private readonly maxAttempts: number;

  private readonly backoffBaseMs: number;

  private readonly onDeadLetter?: (event: PaymentWebhookEvent) => void;

  private timer?: NodeJS.Timeout;

  private running = false;

  constructor(
    private readonly outboxRepository: PaymentWebhookEventRepository,
    private readonly service: MercadoPagoWebhookService,
    options?: PaymentWebhookWorkerOptions,
  ) {
    this.intervalMs = options?.intervalMs ?? 5000;
    this.batchSize = options?.batchSize ?? 10;
    this.maxAttempts = options?.maxAttempts ?? 5;
    this.backoffBaseMs = options?.backoffBaseMs ?? 5000;
    this.onDeadLetter = options?.onDeadLetter;
  }

  start(): void {
    if (this.timer) return;
    this.timer = setInterval(() => {
      void this.tick();
    }, this.intervalMs);
    this.timer.unref();
  }

  /**
   * Stops the interval and resolves once any in-flight tick has finished, so
   * callers can close the DB pool without orphaning a transaction mid-commit.
   */
  async stop(): Promise<void> {
    if (this.timer) clearInterval(this.timer);
    this.timer = undefined;
    while (this.running) {
      await new Promise<void>((resolve) => setTimeout(resolve, 25));
    }
  }

  /** Public so tests can invoke it deterministically (no sleeps). */
  async tick(): Promise<void> {
    if (this.running) return;
    this.running = true;
    try {
      await this.outboxRepository.claimDue(async (events, client) => {
        for (const event of events) {
          await this.processEvent(event, client);
        }
      }, this.batchSize);
    } catch (error) {
      logger.error("Payment webhook outbox tick failed", error);
    } finally {
      this.running = false;
    }
  }

  private async processEvent(event: PaymentWebhookEvent, client: PoolClient): Promise<void> {
    // Run each row inside its own savepoint: if processing fails part-way
    // (JS error, not a SQL abort), roll back to the savepoint so the partial
    // business mutations (order/appointment) are undone, then schedule the
    // retry mark OUTSIDE the savepoint so it survives the final COMMIT.
    await client.query("SAVEPOINT outbox_process");
    let result: WebhookProcessResult;
    try {
      result = await this.service.processWebhook(toWebhookBody(event), client);
      switch (result.status) {
        case "processed":
        case "already_processed":
        case "ignored":
          await this.outboxRepository.markProcessed(event.id, client);
          break;
        case "retry":
          await this.scheduleRetry(event, client, result.reason);
          break;
        case "dead_letter":
          await this.outboxRepository.markDeadLetter(event.id, result.reason, client);
          this.onDeadLetter?.(event);
          break;
      }
      await client.query("RELEASE SAVEPOINT outbox_process");
    } catch (error) {
      try {
        await client.query("ROLLBACK TO SAVEPOINT outbox_process");
      } catch (rollbackErr) {
        throw rollbackErr;
      }
      const message = error instanceof Error ? error.message : String(error);
      logger.error(`Payment webhook processing failed for event ${event.id}`, error);
      await this.scheduleRetry(event, client, message);
    }
  }

  private async scheduleRetry(
    event: PaymentWebhookEvent,
    client: PoolClient,
    reason: string,
  ): Promise<void> {
    // Honor the per-row retry budget (max_attempts column) so operators can
    // tune it per payment; fall back to the worker option.
    const maxAttempts = event.max_attempts ?? this.maxAttempts;
    const nextAttempt = event.attempts + 1;
    if (nextAttempt >= maxAttempts) {
      await this.outboxRepository.markDeadLetter(event.id, reason, client);
      this.onDeadLetter?.(event);
      return;
    }
    const backoffMs = applyJitter(computeBackoff(nextAttempt, this.backoffBaseMs));
    const availableAt = new Date(Date.now() + backoffMs);
    await this.outboxRepository.markRetry(event.id, nextAttempt, availableAt, reason, client);
    logger.warn("webhook retry scheduled", {
      id: event.id,
      payment_id: event.payment_id,
      attempts: nextAttempt,
      nextAttemptAt: availableAt,
    });
  }
}
