import { Request, Response, NextFunction } from "express";

interface ErrorResponse {
  status: number;
  message: string;
  details?: any;
}

export const errorHandler = (err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error("[ERROR]", err.stack);

  let response: ErrorResponse | any = {};

  switch (err.name) {
    case "ValidationError":
      response.status = 400;
      response.message = "Validation Error";
      response.details = err.message;
      break;
    case "NotFoundError":
      response.status = 404;
      response.message = "Resource Not Found";
      response.details = err.message;
      break;
    case "UnauthorizedError":
      response.status = 401;
      response.message = "Unauthorized Access";
      response.details = err.message;
      break;
    default:
      response.status = 500;
      response.message = "Internal Server Error";
      response.details = "An unexpected error occurred";
  }

  res.status(response.status).json(response);
};
