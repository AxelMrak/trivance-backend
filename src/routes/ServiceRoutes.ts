import { Router } from "express";
import authMiddleware from "@middlewares/authmiddleware";
import { attachUserRole, requireMinRole } from "@/middlewares/roleMiddleware";
import { validateServiceCreate, validateServiceUpdate } from "@middlewares/validation";
import { ServiceRepository } from "@/repositories/ServiceRepository";
import { ServiceHandlerService } from "@/services/ServiceHandlerService";
import { ServiceController } from "@/controllers/ServiceController";
import { UserRepository } from "@/repositories/UserRepository";

const router = Router();
const serviceRepository = new ServiceRepository();
const serviceHandlerService = new ServiceHandlerService(serviceRepository);
const userRepo = new UserRepository();
const serviceController = new ServiceController(serviceHandlerService, userRepo);

router.post(
  "/create",
  [validateServiceCreate, authMiddleware, attachUserRole(), requireMinRole(2)],
  serviceController.createService,
);
router.get("/get/:id", authMiddleware, attachUserRole(), serviceController.getServiceById);
router.get("/getAll", authMiddleware, attachUserRole(), serviceController.getAllCompanyServices);
router.put(
  "/update/:id",
  [validateServiceUpdate, authMiddleware, attachUserRole(), requireMinRole(2)],
  serviceController.updateService,
);
router.delete(
  "/delete/:id",
  authMiddleware,
  attachUserRole(),
  requireMinRole(2),
  serviceController.deleteService,
);

/* router.get("/protected",authMiddleware, authController.protectedRoute); */
export default router;
