import app from "@/app";
import { logger } from "@/utils/logger";
import { config } from "@config/constants";
import { dbClient } from "@config/db";
import { AppointmentRepository } from "@/repositories/AppointmentRepository";
import { OrderRepository } from "@/repositories/OrderRepository";
import { PaymentEventRepository } from "@/repositories/PaymentEventRepository";
import { PaymentWebhookEventRepository } from "@/repositories/PaymentWebhookEventRepository";
import { PaymentServiceFactory } from "@/services/payments/PaymentServiceFactory";
import { MercadoPagoWebhookService } from "@/services/webhooks/MercadoPagoWebhookService";
import { PaymentWebhookWorker } from "@/workers/paymentWebhookWorker";

const PORT = config.PORT;

const orderRepository = new OrderRepository(dbClient);
const appointmentRepository = new AppointmentRepository(dbClient);
const paymentEventRepository = new PaymentEventRepository(dbClient);
const paymentProvider = PaymentServiceFactory.getProvider("mercadopago");
const paymentWebhookEventRepository = new PaymentWebhookEventRepository(dbClient);
const mercadoPagoWebhookService = new MercadoPagoWebhookService(
  orderRepository,
  appointmentRepository,
  paymentEventRepository,
  paymentProvider,
);
const paymentWebhookWorker = new PaymentWebhookWorker(
  paymentWebhookEventRepository,
  mercadoPagoWebhookService,
  {
    onDeadLetter: (event) =>
      logger.error("payment webhook dead-lettered", {
        id: event.id,
        payment_id: event.payment_id,
        attempts: event.attempts,
        reason: event.last_error,
      }),
  },
);

const server = app.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);
  paymentWebhookWorker.start();
});

server.on("error", (error: Error) => {
  const err = error as NodeJS.ErrnoException;
  const detail = err.code ? ` (${err.code})` : "";
  logger.error(`Server failed to start${detail}:`, err.message);
  process.exit(1);
});

let stopping = false;
let force: NodeJS.Timeout | undefined;

function finish(exitCode: number): void {
  if (force) clearTimeout(force);
  process.exit(exitCode);
}

function shutdown(signal: string, exitCode = 0): void {
  if (stopping) return;
  stopping = true;
  logger.info(`${signal} received, shutting down`);

  force = setTimeout(() => {
    logger.error("Forced shutdown after timeout");
    process.exit(1);
  }, 10_000);
  force.unref();

  server.close(() => {
    paymentWebhookWorker
      .stop()
      .then(() => dbClient.end())
      .then(() => finish(exitCode))
      .catch((err: Error) => {
        logger.error("Error closing database pool:", err.message);
        finish(1);
      });
  });

  setTimeout(() => server.closeIdleConnections(), 3_000).unref();
}

function fatal(reason: string, err: unknown): void {
  logger.error(reason, err);
  shutdown("fatal", 1);
}

process.once("uncaughtException", (err) => fatal("Uncaught exception:", err));
process.once("unhandledRejection", (reason) => fatal("Unhandled promise rejection:", reason));

process.once("SIGTERM", () => shutdown("SIGTERM"));
process.once("SIGINT", () => shutdown("SIGINT"));
