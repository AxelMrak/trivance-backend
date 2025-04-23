import { Router } from "express";
import { AuthRepository } from "../repositories/AuthRepository";
import { AuthService } from "../services/AuthService";
import { AuthController } from "../controllers/AuthController";
import { validateUserCreate } from "../middlewares/validation";

const router = Router();

const authRepository = new AuthRepository();
const authService = new AuthService(authRepository);
const authController = new AuthController(authService);
router.use(validateUserCreate);
router.post("/sign-up", authController.signUp);

export default router;
