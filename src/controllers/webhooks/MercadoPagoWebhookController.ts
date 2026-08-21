import { Request, Response } from "express";

import { MercadoPagoWebhookBody } from "@/services/webhooks/MercadoPagoWebhookService";
import { verifyWebhookSignature } from "@/services/webhooks/webhookSignature";
import { MP_WEBHOOK_SECRET, MP_WEBHOOK_TOLERANCE_S } from "@/config/env";

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

// Stores the full original payload as a JSON value (express.raw yields a
// Buffer on routes without a json body parser, e.g. the integration tests).
function toStorablePayload(raw: unknown): unknown {
  if (Buffer.isBuffer(raw)) {
    try {
      return JSON.parse(raw.toString("utf8"));
    } catch {
      return raw.toString("utf8");
    }
  }
  return raw;
}

export class MercadoPagoWebhookController {
  constructor(private outboxRepository: PaymentWebhookEventRepository) {}

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

      if (body.type !== "payment") {
        res.status(200).json({ status: "ignored" });
        return;
      }

      // Durably persist BEFORE acknowledging: if this insert fails (e.g. DB
      // down) we return 500 so Mercado Pago retries the delivery.
      await this.outboxRepository.insert({
        provider: "mercadopago",
        payment_id: body.data.id,
        payload: toStorablePayload(req.body),
      });
      res.status(200).json({ status: "accepted" });
    } catch {
      res.status(500).json({ error: "Internal server error" });
    }
  };
}
