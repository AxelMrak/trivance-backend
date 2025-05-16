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

const AuthMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const token = req.cookies?.token || req.headers["authorization"]?.split(" ")[1];

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

export default AuthMiddleware;

