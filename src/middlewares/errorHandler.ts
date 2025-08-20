import { Request, Response, NextFunction } from "express";

import { ErrorResponse } from "@/entities/Response";

export const errorHandler = (err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error("[ERROR]", err.stack || err.message);

  const response: Partial<ErrorResponse> = {};

  switch (err.name) {
    case "ValidationError":
      response.status = 400;
      response.message = "Error de validacion";
      response.details = err.message;
      break;

    case "NotFoundError":
      response.status = 404;
      response.message = "Resource Not Found";
      response.details = err.message;
      break;

    case "UnauthorizedError":
      response.status = 401;
      response.message = "Acceso no autorizado";
      response.details = err.message;
      break;

    default:
      response.status = 500;
      response.message = err.name || "Internal Server Error";
      response.details = err.message || "Se ha producido un error inesperado";
  }

  res.status(response.status).json(response);
};
