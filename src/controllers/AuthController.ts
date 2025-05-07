declare global {
  namespace Express {
    interface Request {
      user?: any; // TODO: Define a proper type for user
    }
  }
}
import { Request, Response } from "express";
import { AuthService } from "@services/AuthService";
export class AuthController {
  constructor(private authService: AuthService) {}

  signUp = async (req: Request, res: Response) => {
    try {
      const payload = req.body;
      const user = await this.authService.signUp(payload);
      res.status(201).json(user);
    } catch (error) {
      if (error instanceof Error) {
        res.status(500).json({ message: error.message });
      }
    }
  };
  signIn = async (req: Request, res: Response) => {
    try {
      const { email, password } = req.body;
    const userAgent = req.headers["user-agent"] || "unknown";
    const ipAddress = req.ip || req.connection?.remoteAddress || "unknown";

      const session = await this.authService.signIn(email, password, userAgent, ipAddress);
      res.status(200).json(session);
    } catch (error) {
      if (error instanceof Error) {
        res.status(401).json({ message: error.message });
      }
    }
  };
  protectedRoute = async (req: Request, res: Response) => {
    try {
      const user = req.user; 
      if (!user) {
        return res.status(403).json({ message: "Access denied" });
      }
      res.status(200).json({ message: "Protected route accessed", user });
    } catch (error) {
      if (error instanceof Error) {
        res.status(500).json({ message: error.message });
      }
    }
  };
  
}
