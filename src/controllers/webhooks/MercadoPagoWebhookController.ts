import { Request, Response } from "express";
import crypto from "crypto";

import { MercadoPagoWebhookService } from "@/services/webhooks/MercadoPagoWebhookService";

const SHARED_SECRET = process.env.MP_WEBHOOK_SECRET!;

export class MercadoPagoWebhookController {
  constructor(private service: MercadoPagoWebhookService) {}

  handle = async (req: Request, res: Response): Promise<any> => {
    try {
      const signatureHeader = req.headers["x-signature"] as string;
      const requestId = req.headers["x-request-id"] as string;
      if (!signatureHeader || !requestId) {
        console.warn("Missing signature or request ID");
        return res.status(400).send("Missing headers");
      }

      const rawBody = req.body.toString("utf8");

      const parts = signatureHeader.split(",");
      let ts: string | undefined;
      let v1: string | undefined;

      for (const part of parts) {
        const [key, value] = part.split("=");
        if (key === "ts") ts = value;
        if (key === "v1") v1 = value;
      }

      if (!ts || !v1) {
        return res.status(400).send("Invalid signature format");
      }

      const bodyJson = JSON.parse(rawBody);
      const dataID = bodyJson?.data?.id;

      const manifest = `id:${dataID};request-id:${requestId};ts:${ts};`;

      const hmac = crypto.createHmac("sha256", SHARED_SECRET);
      hmac.update(manifest);
      const expectedSignature = hmac.digest("hex");

      if (expectedSignature !== v1) {
        console.warn("Signature verification failed");
        return res.status(401).send("Unauthorized");
      }
      console.log("JSON body:", bodyJson);
      const response = await this.service.processWebhook(bodyJson);
      console.log("Webhook processed successfully:", response);
      res.status(200).send(response);
    } catch (error) {
      console.error("Error handling Mercado Pago webhook:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  };
}
