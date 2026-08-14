import { Request, Response, NextFunction, ErrorRequestHandler } from "express";

import { AppError } from "@/errors/httpErrors";

function summarizeCause(cause: unknown): unknown {
  if (!(cause instanceof Error)) return cause;
  const causeError = cause as Error & { code?: unknown; constraint?: unknown };
  return {
    name: causeError.name,
    message: causeError.message,
    ...(typeof causeError.code === "string" && { code: causeError.code }),
    ...(typeof causeError.constraint === "string" && { constraint: causeError.constraint }),
  };
}

export const errorHandler: ErrorRequestHandler = (
  err: unknown,
  req: Request,
  res: Response,
  _next: NextFunction,
): void => {
  const cause = err instanceof AppError ? err.cause : undefined;
  const messageForLog =
    err instanceof Error ? err.message : typeof err === "string" ? err : "Unknown error";

  console.error(`[${new Date().toISOString()}] Error:`, {
    message: messageForLog,
    ...(err instanceof Error && { stack: err.stack }),
    ...(cause !== undefined && { cause: summarizeCause(cause) }),
    method: req.method,
    url: req.url,
    ip: req.ip,
  });

  let statusCode = 500;
  let message = "Internal Server Error";

  if (err instanceof AppError) {
    statusCode = err.statusCode;
    message = err.message;
  } else if (err instanceof Error) {
    switch (err.name) {
      case "SyntaxError":
        statusCode = 400;
        message = "Bad Request - Malformed JSON";
        try {
          const anyReq = req as any;
          const raw = anyReq?.rawBody;
          const rawSample = Buffer.isBuffer(raw)
            ? raw.toString("utf8").slice(0, 500)
            : typeof raw === "string"
              ? raw.slice(0, 500)
              : undefined;
          console.error("Malformed JSON payload details:", {
            contentType: req.headers["content-type"],
            rawSample,
          });
        } catch {}
        break;
      case "ValidationError":
        statusCode = 400;
        message = "Bad Request - Validation Error";
        break;
      case "UnauthorizedError":
        statusCode = 401;
        message = "Unauthorized - Invalid Token";
        break;
      default:
        if (err.message) {
          message = err.message;
        }
        break;
    }

    if (err.message?.includes("duplicate key value violates unique constraint")) {
      statusCode = 400;

      if (err.message.includes("uq_clients_email_company")) {
        message = "El correo electrónico ya existe y pertenece a otro cliente.";
      } else {
        message = "Los datos ingresados ya existen en otro cliente.";
      }
    }
  }
  // Non-Error values (string, plain object): logged above, never leaked to the client.

  const errorResponse = {
    message,
    error: {
      message,
      ...(process.env.NODE_ENV === "development" &&
        err instanceof Error && {
          details: err.message,
          stack: err.stack,
        }),
    },
    timestamp: new Date().toISOString(),
    path: req.url,
    method: req.method,
  };

  if (!res.headersSent) {
    res.status(statusCode).json(errorResponse);
  }
};
