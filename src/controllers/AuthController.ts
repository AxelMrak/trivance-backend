import { Request, Response } from "express";
import { AuthService } from "../services/AuthService";

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
}
