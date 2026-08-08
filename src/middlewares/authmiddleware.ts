import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

import { config } from "@config/constants";

export interface AuthRequest extends Request {
  user?: JwtPayload;
}
export type JwtPayload = {
  userId: string;
  role: number;
};

const AuthMiddleware = (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = (req.headers.authorization || "") as string;
  let token = req.cookies?.token as string | undefined;

  if (!token && authHeader) {
    const parts = authHeader.trim().split(" ");
    token = parts.length === 2 ? parts[1] : parts[0];
  }

  if (!token) {
    return res.status(401).json({ message: "No token provided" });
  }

  try {
    const decoded = jwt.verify(token, config.JWT_SECRET) as JwtPayload;
    req.user = decoded;
    next();
  } catch {
    return res.status(401).json({ message: "Token invalido" });
  }
};

export default AuthMiddleware;
