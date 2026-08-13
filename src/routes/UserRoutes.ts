import { Router } from "express";

import { dbClient } from "@/config/db";
import { UserController } from "@controllers/UserController";
import { UserService } from "@services/UserService";
import { UserRepository } from "@repositories/UserRepository";
import AuthMiddleware from "@middlewares/authmiddleware";
import { attachUserRole, requireMinRole } from "@middlewares/roleMiddleware";

const router = Router();

const userRepository = new UserRepository(dbClient);
const userService = new UserService(userRepository);
const userController = new UserController(userService);

router.get("/getAll", AuthMiddleware, attachUserRole(), requireMinRole(3), userController.getAll);
router.get("/get/:id", AuthMiddleware, attachUserRole(), requireMinRole(3), userController.getById);

export default router;
