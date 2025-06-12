import { Router } from "express";

import { AppointmentController } from "@controllers/AppointmentController";
import { AppointmentService } from "@/services/AppointmentService";
import { AppointmentRepository } from "@/repositories/AppointmentRepository";
import AuthMiddleware from "@/middlewares/authmiddleware";
import { validateAppointmentCreate } from "@/middlewares/validateAppointmentCreate";
import { ServiceHandlerService } from "@/services/ServiceHandlerService";
import { OrderService } from "@/services/OrderService";
import { OrderRepository } from "@/repositories/OrderRepository";
import { ServicesRepository } from "@/repositories/ServiceRepository";

const router = Router();
const appointmentRepository = new AppointmentRepository();
const serviceRepository = new ServicesRepository();
const serviceHandlerService = new ServiceHandlerService(serviceRepository);
const orderRepository = new OrderRepository();
const orderService = new OrderService(orderRepository);
const appointmentService = new AppointmentService(
  appointmentRepository,
  serviceHandlerService,
  orderService,
);
const appointmentController = new AppointmentController(appointmentService);

router.post(
  "/create",
  [validateAppointmentCreate, AuthMiddleware],
  appointmentController.createAppointment,
);
router.get("/getAll", AuthMiddleware, appointmentController.getAll);
router.get("/get/:id", AuthMiddleware, appointmentController.getById);
router.put("/update/:id", AuthMiddleware, appointmentController.updateAppointment);
router.delete("/delete/:id", AuthMiddleware, appointmentController.deleteAppointment);
router.post(
  "/payment/:id/link",
  AuthMiddleware,
  appointmentController.createAppointmentPaymentLink,
);

export default router;
