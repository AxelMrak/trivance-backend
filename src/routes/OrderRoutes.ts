import { Router } from "express";
import { dbClient } from "@/config/db";

import { OrderService } from "@/services/OrderService";
import { OrderRepository } from "@/repositories/OrderRepository";
import { AppointmentRepository } from "@/repositories/AppointmentRepository";
import AuthMiddleware from "@/middlewares/authmiddleware";
import { attachUserRole } from "@/middlewares/roleMiddleware";
import { OrderController } from "@/controllers/OrderController";

const router = Router();

const orderRepository = new OrderRepository(dbClient);
const orderService = new OrderService(orderRepository);
const appointmentRepository = new AppointmentRepository(dbClient);
const orderController = new OrderController(orderService, appointmentRepository);

router.get("/:id", AuthMiddleware, attachUserRole(), orderController.getById);

export default router;
