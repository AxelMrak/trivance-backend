import app from "@/app";
import { logger } from "@/utils/logger";
import { config } from "@config/env";
import { dbClient } from "@config/db";

const PORT = config.PORT;

const server = app.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);
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
    dbClient
      .end()
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
