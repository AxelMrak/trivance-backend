import { Preference } from "mercadopago";

import { mercadoPagoClient } from "@/config/mercadopago";
import { PaymentProvider } from "@/entities/PaymentProvider";
import { InternalServerError } from "@/errors/httpErrors";

export class MercadoPagoService implements PaymentProvider {
  private preference = new Preference(mercadoPagoClient);

  async createPaymentLink(item: {
    id: string;
    title: string;
    price: number;
    orderId: string;
  }): Promise<string> {
    // In tests, avoid external network calls and return a deterministic stub
    if (process.env.NODE_ENV === "test") {
      return {
        id: `test-pref-${item.id}`,
        init_point: `https://payments.example.test/pay/${item.id}`,
      } as any;
    }
    const siteUrlRaw = (await process.env.SITE_URL) || "http://localhost";
    console.log("SITE_URL:", siteUrlRaw);
    const siteUrl = siteUrlRaw.replace(/\/$/, "");
    if (!siteUrl) {
      throw new InternalServerError(
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

    const response: any = await this.preference.create({ body: payload });

    if (!response || !response.init_point) {
      throw new InternalServerError("Fallo al crear el link de pago en Mercado Pago");
    }

    return response;
  }
}
