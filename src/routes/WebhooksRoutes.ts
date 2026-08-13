import { Router } from "express";
import { dbClient } from "@/config/db";
import express from "express";

import { OrderService } from "@/services/OrderService";
import { AppointmentService } from "@/services/AppointmentService";
import { OrderRepository } from "@/repositories/OrderRepository";
import { AppointmentRepository } from "@/repositories/AppointmentRepository";
import { ServiceHandlerService } from "@/services/ServiceHandlerService";
import { ServiceRepository } from "@/repositories/ServiceRepository";
import { MercadoPagoWebhookService } from "@/services/webhooks/MercadoPagoWebhookService";
import { MercadoPagoWebhookController } from "@/controllers/webhooks/MercadoPagoWebhookController";
import { UserRepository } from "@/repositories/UserRepository";
import { ClientsPivotRepository } from "@/repositories/ClientsPivotRepository";
import { ClientsRepository } from "@/repositories/ClientsRepository";

const router = Router();
const serviceRepository = new ServiceRepository(dbClient);
const serviceHandlerService = new ServiceHandlerService(serviceRepository);
const orderRepository = new OrderRepository(dbClient);
const orderService = new OrderService(orderRepository);
const appointmentRepository = new AppointmentRepository(dbClient);
const userRepository = new UserRepository(dbClient);
const clientsPivotRepository = new ClientsPivotRepository();
const clientsRepository = new ClientsRepository();
const appointmentService = new AppointmentService(
  appointmentRepository,
  serviceHandlerService,
  orderService,
  userRepository,
  clientsPivotRepository,
  clientsRepository,
);

const mercadoPagoWebhookService = new MercadoPagoWebhookService(orderService, appointmentService);
const mercadoPagoWebhookController = new MercadoPagoWebhookController(mercadoPagoWebhookService);
router.get("/", (_req, res) => {
  res.json({
    message: "Webhooks API esta corriendo",
    status: "OK",
  });
});
router.post(
  "/mercadopago",
  express.raw({ type: "application/json" }),
  mercadoPagoWebhookController.handle,
);

router.use(express.json()); // Ensure JSON body parsing is enabled for other routes

export default router;
