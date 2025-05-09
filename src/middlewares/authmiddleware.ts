import { Response, NextFunction, Request } from "express";
import jwt from "jsonwebtoken";

const AuthMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const token = req.cookies?.token;

  if (!token) {
    return res.status(403).json({ message: "No token provided" });
  }

  const isTokenValid = jwt.verify(token, process.env.JWT_SECRET!);

  if (!isTokenValid) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const decoded = jwt.decode(token);

  if (!decoded) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  next();
};

export default AuthMiddleware;
