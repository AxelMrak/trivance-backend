import { Request, Response, NextFunction } from "express";

interface ErrorResponse {
  status: number;
  message: string;
  details?: any;
}

export const errorHandler = (err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error("[ERROR]", err.stack);

  const response: ErrorResponse = {
    status: 500,
    message: "Internal Server Error",
  };

  if (err.name === "ValidationError") {
    response.status = 400;
    response.message = "Validation Error";
    response.details = err.message;
  }

  res.status(response.status).json(response);
};
