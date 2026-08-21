import { Preference } from "mercadopago";

import { logger } from "@/utils/logger";
import { mercadoPagoClient } from "@/config/mercadopago";
import { config } from "@/config/env";

export class PaymentService {
  private mercadopagoClient = mercadoPagoClient;

  async createPaymentLink(item: {
    id: string;
    title: string;
    price: number;
    orderId: string;
  }): Promise<any> {
    const preference = new Preference(this.mercadopagoClient);

    const siteUrl = config.SITE_URL;
    const payload = {
      items: [
        {
          id: item.id,
          title: item.title,
          quantity: 1,
          unit_price: Number(item.price),
          currency_id: "ARS",
        },
      ],
      external_reference: item.orderId,
      back_urls: {
        success: `${siteUrl}/dashboard/payment/success?order_id=${item.orderId}`,
        failure: `${siteUrl}/dashboard/payment/cancelled`,
        pending: `${siteUrl}/dashboard/payment/cancelled`,
      },
      auto_return: "approved",
      notification_url: `${siteUrl}/api/webhooks/mercadopago`,
    };

    const response: any = await preference.create({ body: payload });
    if (!response) {
      logger.error("Failed to create payment link:", response);
      throw new Error("Fallo al crear el link de pago");
    }

    return response;
  }
}
