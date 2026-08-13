import { Request, Response, NextFunction } from "express";

import { logger } from "@/utils/logger";

export const requestLogger = (req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  const { method, url, ip } = req;
  const userAgent = req.get("User-Agent") || "unknown";

  // Log the incoming request
  logger.info(`[${new Date().toISOString()}] → ${method} ${url} - IP: ${ip} - Agent: ${userAgent}`);

  res.on("finish", () => {
    const duration = Date.now() - start;
    const { statusCode } = res;
    const contentLength = res.get("Content-Length") || "-";

    logger.info(
      `[${new Date().toISOString()}] ← ${method} ${url} - ${statusCode} - ${duration}ms - ${contentLength} bytes`,
    );
  });

  next();
};
