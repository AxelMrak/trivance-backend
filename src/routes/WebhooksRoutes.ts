import { Router } from "express";
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

const router = Router();
const serviceRepository = new ServiceRepository();
const serviceHandlerService = new ServiceHandlerService(serviceRepository);
const orderRepository = new OrderRepository();
const orderService = new OrderService(orderRepository);
const appointmentRepository = new AppointmentRepository();
const userRepository = new UserRepository();
const clientsPivotRepository = new ClientsPivotRepository();
const appointmentService = new AppointmentService(
  appointmentRepository,
  serviceHandlerService,
  orderService,
  userRepository,
  clientsPivotRepository,
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

// Test route for Mercado Pago webhooks, does not require signature validation
router.post("/mercadopago/test", express.json(), mercadoPagoWebhookController.handleTest);

router.use(express.json()); // Ensure JSON body parsing is enabled for other routes

export default router;
