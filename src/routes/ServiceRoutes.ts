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
router.get("/get/:id", authMiddleware, serviceController.getServiceById);
router.get("/getAll", authMiddleware, serviceController.getAllCompanyServices);
router.put("/update/:id", [validateServiceCreate, authMiddleware], serviceController.updateService);
router.delete("/delete/:id", authMiddleware, serviceController.deleteService);

/* router.get("/protected",authMiddleware, authController.protectedRoute); */
export default router;
