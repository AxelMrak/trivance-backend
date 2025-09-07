import { Request, Response } from "express";
import crypto from "crypto";

import { MercadoPagoWebhookService } from "@/services/webhooks/MercadoPagoWebhookService";

const SHARED_SECRET = process.env.MP_WEBHOOK_SECRET!;

export class MercadoPagoWebhookController {
  constructor(private service: MercadoPagoWebhookService) {}

  handle = async (req: Request, res: Response): Promise<any> => {
    try {
      console.log("Received Mercado Pago webhook:", req.body);
      const signatureHeader = req.headers["x-signature"] as string;
      const requestId = req.headers["x-request-id"] as string;
      if (!signatureHeader || !requestId) {
        console.warn("Missing signature or request ID");
        return res.status(400).send("Encabezados faltantes");
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
        return res.status(400).send("Formato de encabezado inválido");
      }

      const bodyJson = Buffer.isBuffer(req.body)
        ? (JSON.parse(req.body.toString("utf8")) as any)
        : (req.body as any);
      const dataID = bodyJson?.data?.id;
      console.log("Parsed body JSON:", bodyJson);
      const manifest = `id:${dataID};request-id:${requestId};ts:${ts};`;

      const hmac = crypto.createHmac("sha256", SHARED_SECRET);
      hmac.update(manifest);
      const expectedSignature = hmac.digest("hex");

      if (expectedSignature !== v1) {
        console.warn("Signature verification failed");
        console.log("Manifest:", manifest);
        console.log("Expected Signature:", expectedSignature);
        console.log("Received Signature (v1):", v1);
        return res.status(401).send("No autorizado");
      }
      const response = await this.service.processWebhook(bodyJson);
      res.status(200).send(response);
    } catch (error) {
      console.error("Error handling Mercado Pago webhook:", error);
      res.status(500).json({ error: "Error de servidor.Contacte a soporte" });
    }
  };
}
