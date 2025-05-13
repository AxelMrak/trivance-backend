import { Router } from "express";

import { ServicesController } from "@controllers/ServicesController";
import { ServicesService } from "@services/ServicesService";
import { ServicesRepository } from "@repositories/ServicesRepository";

const router = Router();
const sessionRepository = new SessionRepository();

const authRepository = new AuthRepository();
const authService = new AuthService(authRepository, sessionRepository);
const authController = new AuthController(authService);

router.post("/sign-up", validateUserCreate, authController.signUp);
router.post("/sign-in", validateUserSignIn, authController.signIn);
router.post("/sign-out", authMiddleware, authController.signOut);

/* router.get("/protected",authMiddleware, authController.protectedRoute); */
export default router;