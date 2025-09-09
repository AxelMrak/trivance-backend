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
import { ClientsPivotRepository } from "@/repositories/ClientsPivotRepository";

const router = Router();
const appointmentRepository = new AppointmentRepository();
const serviceRepository = new ServiceRepository();
const serviceHandlerService = new ServiceHandlerService(serviceRepository);
const orderRepository = new OrderRepository();
const orderService = new OrderService(orderRepository);
const userRepository = new UserRepository();
const clientsPivotRepository = new ClientsPivotRepository();
const appointmentService = new AppointmentService(
  appointmentRepository,
  serviceHandlerService,
  orderService,
  userRepository,
  clientsPivotRepository,
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

router.post("/:id/remind", AuthMiddleware, attachUserRole(), appointmentController.sendReminder);

router.get(
  "/occupiedSlots",
  AuthMiddleware,
  attachUserRole(),
  appointmentController.getOccupiedSlots,
);

// RESTful alias for get by id (UUID). Keep after specific routes to avoid conflicts.
router.get(
  "/:id([0-9a-fA-F-]{8}-[0-9a-fA-F-]{4}-[1-5][0-9a-fA-F-]{3}-[89abAB][0-9a-fA-F-]{3}-[0-9a-fA-F-]{12})",
  AuthMiddleware,
  attachUserRole(),
  appointmentController.getById,
);

export default router;
