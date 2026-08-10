import { Request, Response } from "express";
import crypto from "crypto";

import { MercadoPagoWebhookService } from "@/services/webhooks/MercadoPagoWebhookService";

export class MercadoPagoWebhookController {
  constructor(private service: MercadoPagoWebhookService) {}

  handle = async (req: Request, res: Response): Promise<any> => {
    try {
      const signatureHeader = req.headers["x-signature"] as string;
      const requestId = req.headers["x-request-id"] as string;
      if (!signatureHeader || !requestId) {
        return res.status(400).send("Missing required headers");
      }

      const parts = signatureHeader.split(",");
      let ts: string | undefined;
      let v1: string | undefined;

      for (const part of parts) {
        const [key, value] = part.split("=");
        if (key === "ts") ts = value;
        if (key === "v1") v1 = value;
      }

      if (!ts || !v1) {
        return res.status(400).send("Invalid header format");
      }

      const bodyJson = Buffer.isBuffer(req.body)
        ? (JSON.parse(req.body.toString("utf8")) as any)
        : (req.body as any);
      const dataID = bodyJson?.data?.id;
      const manifest = `id:${dataID};request-id:${requestId};ts:${ts};`;

      const hmac = crypto.createHmac("sha256", process.env.MP_WEBHOOK_SECRET!);
      hmac.update(manifest);
      const expectedSignature = hmac.digest("hex");

      if (expectedSignature !== v1) {
        return res.status(401).send("Unauthorized");
      }

      // Respond immediately to Mercado Pago
      res.status(200).send({ status: "received" });

      // Process the webhook asynchronously
      this.service.processWebhook(bodyJson).catch((error) => {
        console.error("Error processing webhook asynchronously:", error);
      });
    } catch (error) {
      console.error("Error in webhook handler:", error);
      // Do not send error details to the client in the webhook response
      if (!res.headersSent) {
        res.status(500).send({ error: "Internal server error" });
      }
    }
  };
}
