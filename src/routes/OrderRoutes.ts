import { Router } from "express";

import { OrderService } from "@/services/OrderService";
import { OrderRepository } from "@/repositories/OrderRepository";
import { AppointmentRepository } from "@/repositories/AppointmentRepository";
import AuthMiddleware from "@/middlewares/authmiddleware";
import { attachUserRole } from "@/middlewares/roleMiddleware";
import { OrderController } from "@/controllers/OrderController";

const router = Router();

const orderRepository = new OrderRepository();
const orderService = new OrderService(orderRepository);
const appointmentRepository = new AppointmentRepository();
const orderController = new OrderController(orderService, appointmentRepository);

router.get("/:id", AuthMiddleware, attachUserRole(), orderController.getById);

export default router;
