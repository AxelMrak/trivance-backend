import { Request, Response, NextFunction, ErrorRequestHandler } from "express";
import { AppError } from "@/errors/httpErrors";

export const errorHandler: ErrorRequestHandler = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  console.error(`[${new Date().toISOString()}] Error:`, {
    message: err.message,
    stack: err.stack,
    method: req.method,
    url: req.url,
    ip: req.ip,
  });

  // Default fallback
  let statusCode = 500;
  let message = "Internal Server Error";

  // First, respect our domain errors
  if (err instanceof AppError) {
    statusCode = err.statusCode;
    message = err.message;
  } else {
    // Then, map common framework/runtime errors
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
  }

  const errorResponse = {
    message,
    error: {
      message,
      ...(process.env.NODE_ENV === "development" && {
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
