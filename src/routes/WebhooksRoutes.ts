import { Router } from "express";
import express from "express";

import { dbClient } from "@/config/db";
import { OrderRepository } from "@/repositories/OrderRepository";
import { AppointmentRepository } from "@/repositories/AppointmentRepository";
import { PaymentEventRepository } from "@/repositories/PaymentEventRepository";
import { PaymentServiceFactory } from "@/services/payments/PaymentServiceFactory";
import { MercadoPagoWebhookService } from "@/services/webhooks/MercadoPagoWebhookService";
import { MercadoPagoWebhookController } from "@/controllers/webhooks/MercadoPagoWebhookController";

const router = Router();
const orderRepository = new OrderRepository(dbClient);
const appointmentRepository = new AppointmentRepository(dbClient);
const paymentEventRepository = new PaymentEventRepository(dbClient);
const paymentProvider = PaymentServiceFactory.getProvider("mercadopago");

const mercadoPagoWebhookService = new MercadoPagoWebhookService(
  orderRepository,
  appointmentRepository,
  paymentEventRepository,
  paymentProvider,
);
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

router.use(express.json());

export default router;
