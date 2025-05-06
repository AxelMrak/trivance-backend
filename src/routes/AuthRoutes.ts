import { Router } from "express";
import { AuthController } from "@controllers/AuthController";
import { AuthService } from "@services/AuthService";
import { AuthRepository } from "@repositories/AuthRepository";
import { validateUserCreate, validateUserSignIn } from "@middlewares/validation";

const router = Router();

const authRepository = new AuthRepository();
const authService = new AuthService(authRepository);
const authController = new AuthController(authService);

router.post("/sign-up", validateUserCreate, authController.signUp);

router.post("/sign-in", validateUserSignIn, authController.signIn);

export default router;
