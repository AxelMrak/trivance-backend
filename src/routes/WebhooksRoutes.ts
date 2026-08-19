import { Router } from "express";
import express from "express";

import { dbClient } from "@/config/db";
import { PaymentWebhookEventRepository } from "@/repositories/PaymentWebhookEventRepository";
import { MercadoPagoWebhookController } from "@/controllers/webhooks/MercadoPagoWebhookController";

const router = Router();
const paymentWebhookEventRepository = new PaymentWebhookEventRepository(dbClient);
const mercadoPagoWebhookController = new MercadoPagoWebhookController(
  paymentWebhookEventRepository,
);
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
