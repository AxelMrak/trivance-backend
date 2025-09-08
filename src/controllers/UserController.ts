import { Request, Response, NextFunction } from "express";

import { UserService } from "@services/UserService";

export class UserController {
  constructor(private userService: UserService) {}

  getAll = async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const users = await this.userService.getUsers();
      res.json(users);
    } catch (error) {
      next(error as any);
    }
  };

  getById = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.params.id;

      const user = await this.userService.getUserByID(userId);

      if (user) {
        res.json(user);
      } else {
        res.status(404).json({ message: "Usuario no encontrado" });
      }
    } catch (error) {
      next(error as any);
    }
  };
}
