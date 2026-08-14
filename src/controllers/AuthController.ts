import { Request, Response, NextFunction } from "express";

import { AuthService } from "@services/AuthService";
import { JwtPayload } from "@/middlewares/authmiddleware";

interface AuthRequest extends Request {
  user?: JwtPayload;
}

export class AuthController {
  constructor(private authService: AuthService) {}

  signUp = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const payload = req.body;
      const userAgent = req.headers["user-agent"] || "unknown";
      const ipAddress = req.ip || "unknown";

      const data = await this.authService.signUp(payload, userAgent, ipAddress);
      const token = data?.session?.token;

      if (!token) {
        return res.status(500).json({ message: "Error al crear usuario" });
      }

      res.cookie("token", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: data?.session?.expiresIn * 1000 || 24 * 60 * 60 * 1000,
        path: "/",
      });

      res.status(201).json({ user: data?.user });
    } catch (error) {
      next(error);
    }
  };

  signIn = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email, password } = req.body;
      const userAgent = req.headers["user-agent"] || "unknown";
      const ipAddress = req.ip || "unknown";

      const data = await this.authService.signIn(email, password, userAgent, ipAddress);
      const token = data.session.token;

      res.cookie("token", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: data.session.expiresIn * 1000,
        path: "/",
      });

      res.status(200).json({ user: data.user });
    } catch (error) {
      next(error);
    }
  };

  signOut = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const token = req.cookies.token;
      await this.authService.signOut(token);
      res.clearCookie("token");
      res.status(200).json({ message: "Se cerró sesión exitosamente" });
    } catch (error) {
      next(error);
    }
  };

  getMe = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user?.userId) {
        res.status(401).json({ message: "No autorizado" });
        return;
      }

      const user = await this.authService.getUserById(req.user.userId);

      if (!user) {
        res.status(404).json({ message: "Usuario no encontrado" });
        return;
      }

      res.status(200).json({ user });
    } catch (error) {
      next(error);
    }
  };
}
