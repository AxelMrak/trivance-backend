import { Router } from "express";

import authMiddleware from "@middlewares/authmiddleware";
import { validateServiceCreate } from "@middlewares/validation";
import { ServicesRepository } from "@/repositories/ServiceRepository";
import { ServiceHandlerService } from "@/services/ServiceHandlerService";
import { ServiceController } from "@/controllers/ServiceController";

const router = Router();
const serviceRepository = new ServicesRepository();
const serviceHandlerService = new ServiceHandlerService(serviceRepository);
const serviceController = new ServiceController(serviceHandlerService);

router.post("/create", [validateServiceCreate, authMiddleware], serviceController.createService);

/* router.get("/protected",authMiddleware, authController.protectedRoute); */
export default router;
