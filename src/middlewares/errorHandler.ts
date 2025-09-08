import { Request, Response, NextFunction, ErrorRequestHandler } from "express";

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

  let statusCode = 500;
  let message = "Internal Server Error";

  switch (err.name) {
    case "SyntaxError":
      // Commonly thrown by body-parser when JSON is malformed
      statusCode = 400;
      message = "Bad Request - Malformed JSON";
      // Log raw body sample to help debug malformed inputs
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
    case "ForbiddenError":
      statusCode = 403;
      message = "Forbidden - Access Denied";
      break;
    case "NotFoundError":
      statusCode = 404;
      message = "Not Found - Resource does not exist";
      break;
    case "ConflictError":
      statusCode = 409;
      message = "Conflict - Resource already exists";
      break;
    case "TooManyRequestsError":
      statusCode = 429;
      message = "Too Many Requests - Rate limit exceeded";
      break;
    default:
      if (err.message) {
        message = err.message;
      }
      break;
  }

  const errorResponse = {
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
