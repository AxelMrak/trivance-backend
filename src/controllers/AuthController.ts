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
      res.status(500).json({ message: "Error signing up", error });
    }
  };
  signIn = async (req: Request, res: Response) => {
    try {
      const { email, password } = req.body;

      const session = await this.authService.signIn(email, password);
      res.status(200).json(session);
    } catch (error) {
      if (error instanceof Error) {
        res.status(401).json({ message: error.message });
      }
    }
  };
}
