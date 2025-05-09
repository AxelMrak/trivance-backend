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
      if (error instanceof Error) {
        res.status(401).json({ message: error.message });
      }
    }
  };
  signOut = async (req: Request, res: Response) => {
    try {
      const token = req.cookies.token;
      await this.authService.signOut(token);
      res.clearCookie("token");
      res.status(200).json({ message: "Logged out successfully" });
    } catch (error) {
      if (error instanceof Error) {
        res.status(401).json({ message: error.message });
      }
    }
  };
}
