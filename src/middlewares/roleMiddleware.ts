import { NextFunction, Response } from "express";
import { AuthRequest } from "@/middlewares/authmiddleware";
import { RoleService } from "@/services/RoleService";

export const attachUserRole = () => {
  const roleSvc = new RoleService();
  return async (req: AuthRequest, _res: Response, next: NextFunction) => {
    if (!req.user?.userId) return next();
    const level = await roleSvc.getRoleLevelForUser(req.user.userId);
    if (typeof level === "number") {
      req.user.role = level;
    }
    next();
  };
};

export const requireMinRole = (minLevel: number) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    const level = req.user?.role ?? -1;
    if (level >= minLevel) return next();
    return res.status(403).json({ message: "No autorizado" });
  };
};
