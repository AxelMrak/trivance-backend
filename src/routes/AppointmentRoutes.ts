import { Router } from "express";

import { AppointmentController } from "@controllers/AppointmentController";
import { AppointmentService } from "@/services/AppointmentService";
import { AppointmentRepository } from "@/repositories/AppointmentRepository";
import AuthMiddleware from "@/middlewares/authmiddleware";
import { attachUserRole, requireMinRole } from "@/middlewares/roleMiddleware";
import { validateAppointmentCreate, validateAppointmentUpdate } from "@/middlewares/validation";
import { ServiceHandlerService } from "@/services/ServiceHandlerService";
import { OrderService } from "@/services/OrderService";
import { OrderRepository } from "@/repositories/OrderRepository";
import { ServiceRepository } from "@/repositories/ServiceRepository";
import { UserRepository } from "@/repositories/UserRepository";

const router = Router();
const appointmentRepository = new AppointmentRepository();
const serviceRepository = new ServiceRepository();
const serviceHandlerService = new ServiceHandlerService(serviceRepository);
const orderRepository = new OrderRepository();
const orderService = new OrderService(orderRepository);
const userRepository = new UserRepository();
const appointmentService = new AppointmentService(
  appointmentRepository,
  serviceHandlerService,
  orderService,
  userRepository,
);
const appointmentController = new AppointmentController(appointmentService);

router.post(
  "/create",
  AuthMiddleware,
  attachUserRole(),
  validateAppointmentCreate,
  appointmentController.createAppointment,
);
router.get("/getAll", AuthMiddleware, attachUserRole(), appointmentController.getAll);
router.get("/get/:id", AuthMiddleware, attachUserRole(), appointmentController.getById);
router.put(
  "/update/:id",
  AuthMiddleware,
  attachUserRole(),
  validateAppointmentUpdate,
  appointmentController.updateAppointment,
);
router.delete(
  "/delete/:id",
  AuthMiddleware,
  attachUserRole(),
  requireMinRole(2),
  appointmentController.deleteAppointment,
);
router.post(
  "/payment/:id/link",
  AuthMiddleware,
  attachUserRole(),
  appointmentController.createAppointmentPaymentLink,
);

// RESTful alias for get by id. Keep after specific routes to avoid conflicts.
router.get("/:id", AuthMiddleware, attachUserRole(), appointmentController.getById);

export default router;
