import { RequestHandler } from "express";

export const attachUserIdFromToken: RequestHandler = (req, res, next) => {
  const userId = (req as any).user?.userId as string | undefined;
  if (!userId) {
    return res.status(401).json({ message: "No autenticado" });
  }
  req.body = { ...req.body, user_id: userId };
  next();
};
