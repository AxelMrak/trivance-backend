import { Response } from "express";

import { AppError } from "@/errors/httpErrors";

export const errorHandler = (err: Error, res: Response) => {
  console.error(err);

  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      status: "error",
      message: err.message,
    });
  }

  return res.status(500).json({
    status: "error",
    message: "Internal Server Error",
  });
};
