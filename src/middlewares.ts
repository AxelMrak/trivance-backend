import { NextFunction, Request, Response } from "express";

import ErrorResponse from "./interfaces/ErrorResponse";

export function notFound(req: Request, res: Response) {
  const error = new Error(`🔍 - Not Found - ${req.originalUrl}`);
  const statusCode = res.statusCode !== 200 ? res.statusCode : 404;

  res.status(statusCode).json({
    message: error.message,
    stack: process.env.NODE_ENV === "production" ? "🥞" : error.stack,
    status: statusCode,
  });
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(err: Error, res: Response<ErrorResponse>) {
  const statusCode = res.statusCode !== 200 ? res.statusCode : 500;
  res.status(statusCode);
  res.json({
    message: err.message,
    stack: process.env.NODE_ENV === "production" ? "🥞" : err.stack,
  });
}
