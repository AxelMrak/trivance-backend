import { Request, Response } from "express";

import { MercadoPagoWebhookService } from "@/services/webhooks/MercadoPagoWebhookService";

export class MercadoPagoWebhookController {
  constructor(private service: MercadoPagoWebhookService) {}

  handle = async (req: Request, res: Response): Promise<void> => {
    try {
      await this.service.processWebhook(req.body);
      res.status(200).send("OK");
    } catch (error) {
      console.error("Error handling Mercado Pago webhook:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  };
}
