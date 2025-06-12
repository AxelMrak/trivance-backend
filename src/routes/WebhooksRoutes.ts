import { Router } from "express";

import { OrderService } from "@/services/OrderService";
import { AppointmentService } from "@/services/AppointmentService";
import { OrderRepository } from "@/repositories/OrderRepository";
import { AppointmentRepository } from "@/repositories/AppointmentRepository";
import { ServiceHandlerService } from "@/services/ServiceHandlerService";
import { ServicesRepository } from "@/repositories/ServiceRepository";
import { MercadoPagoWebhookService } from "@/services/webhooks/MercadoPagoWebhookService";
import { MercadoPagoWebhookController } from "@/controllers/webhooks/MercadoPagoWebhookController";

const router = Router();
const serviceRepository = new ServicesRepository();
const serviceHandlerService = new ServiceHandlerService(serviceRepository);
const orderRepository = new OrderRepository();
const orderService = new OrderService(orderRepository);
const appointmentRepository = new AppointmentRepository();
const appointmentService = new AppointmentService(
  appointmentRepository,
  serviceHandlerService,
  orderService,
);

const mercadoPagoWebhookService = new MercadoPagoWebhookService(orderService, appointmentService);
const mercadoPagoWebhookController = new MercadoPagoWebhookController(mercadoPagoWebhookService);
router.get("/", (_req, res) => {
  res.json({
    message: "Webhooks API is running",
    status: "OK",
  });
});
router.post("/mercadopago", mercadoPagoWebhookController.handle);

export default router;
