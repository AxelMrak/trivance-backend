import { Router } from "express";
import { AuthController } from "@controllers/AuthController";
import { AuthService } from "@services/AuthService";
import { AuthRepository } from "@repositories/AuthRepository";
import { SessionRepository } from "@repositories/SessionRepository";
import { validateUserCreate, validateUserSignIn } from "@middlewares/validation";
import authMiddleware from '@middlewares/authmiddleware';
const router = Router();
const sessionRepository = new SessionRepository();

const authRepository = new AuthRepository();
const authService = new AuthService(authRepository, sessionRepository);
const authController = new AuthController(authService);

router.post("/sign-up", validateUserCreate, authController.signUp);
router.post("/sign-in", validateUserSignIn, authController.signIn);
router.get("/protected",authMiddleware, authController.protectedRoute); 
export default router;
