import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { User } from "@/entities/User";

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

type JwtPayload = Pick<User, "id" | "name" | "email" | "company_id" | "role">;

const authMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const token = extractToken(req);

  if (!token) {
    return res.status(403).json({ message: "No token provided" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as JwtPayload;
    req.user = decoded;
    next();
  } catch {
    return res.status(401).json({ message: "Invalid token" });
  }
};

const extractToken = (req: Request): string | undefined => {
  if (req.cookies?.token) return req.cookies.token;

  const authHeader = req.headers['authorization'];
  if (authHeader?.startsWith("Bearer ")) {
    return authHeader.slice(7);
  }

  return undefined;
};

export default authMiddleware;