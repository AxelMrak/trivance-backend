import { Request, Response } from "express";

import {
  MercadoPagoWebhookBody,
  MercadoPagoWebhookService,
} from "@/services/webhooks/MercadoPagoWebhookService";
import { verifyWebhookSignature } from "@/services/webhooks/webhookSignature";
import { MP_WEBHOOK_SECRET, MP_WEBHOOK_TOLERANCE_S } from "@/config/constants";

function parseWebhookBody(raw: unknown): MercadoPagoWebhookBody | null {
  let parsed: unknown = raw;
  if (Buffer.isBuffer(raw)) {
    try {
      parsed = JSON.parse(raw.toString("utf8"));
    } catch {
      return null;
    }
  }
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) return null;
  const body = parsed as Record<string, unknown>;
  if (typeof body.type !== "string") return null;
  const data = body.data;
  if (typeof data !== "object" || data === null || Array.isArray(data)) return null;
  const id = (data as Record<string, unknown>).id;
  if (typeof id !== "string") return null;
  return { type: body.type, data: { id } };
}

export class MercadoPagoWebhookController {
  constructor(private service: MercadoPagoWebhookService) {}

  handle = async (req: Request, res: Response): Promise<void> => {
    try {
      const xSignature = req.headers["x-signature"];
      const xRequestId = req.headers["x-request-id"];
      if (typeof xSignature !== "string" || typeof xRequestId !== "string") {
        res.status(400).send("Missing required headers");
        return;
      }

      const body = parseWebhookBody(req.body);
      if (!body) {
        res.status(400).send("Invalid webhook payload");
        return;
      }
      const queryId: unknown = req.query["data.id"];
      if (typeof queryId !== "string" || queryId !== body.data.id) {
        res.status(400).send("data.id in query does not match the request body");
        return;
      }

      const valid = verifyWebhookSignature({
        queryId,
        bodyId: body.data.id,
        xSignature,
        xRequestId,
        secret: MP_WEBHOOK_SECRET,
        nowSeconds: Math.floor(Date.now() / 1000),
        toleranceSeconds: MP_WEBHOOK_TOLERANCE_S,
      });
      if (!valid) {
        res.status(401).send("Invalid signature");
        return;
      }

      const result = await this.service.processWebhook(body);
      res.status(200).json(result);
    } catch {
      res.status(500).json({ error: "Internal server error" });
    }
  };
}
