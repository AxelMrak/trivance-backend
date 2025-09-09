import { Preference } from "mercadopago";

import { mercadoPagoClient } from "@/config/mercadopago";

export class PaymentService {
  private mercadopagoClient = mercadoPagoClient;

  async createPaymentLink(item: {
    id: string;
    title: string;
    price: number;
    orderId: string;
  }): Promise<any> {
    const preference = new Preference(this.mercadopagoClient);

    const siteUrlRaw = process.env.NEXT_PUBLIC_BASE_URL || process.env.SITE_URL || "http://localhost";
    const siteUrl = siteUrlRaw.replace(/\/$/, "");
    if (!siteUrl) {
      throw new Error(
        "Configuración inválida: SITE_URL no está definida para generar back_urls",
      );
    }

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
    console.log("Payment link created:", response);
    if (!response) {
      console.error("Failed to create payment link:", response);
      throw new Error("Fallo al crear el link de pago");
    }

    return response;
  }
}
