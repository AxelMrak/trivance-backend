import { Preference } from "mercadopago";

import { mercadoPagoClient } from "@/config/mercadopago";
import { PaymentProvider } from "@/entities/PaymentProvider";
import { InternalServerError } from "@/errors/httpErrors";

export class MercadoPagoService implements PaymentProvider {
  private preference = new Preference(mercadoPagoClient);

  async createPaymentLink(item: { id: string; title: string; price: number }): Promise<string> {
    // In tests, avoid external network calls and return a deterministic stub
    if (process.env.NODE_ENV === "test") {
      return {
        id: `test-pref-${item.id}`,
        init_point: `https://payments.example.test/pay/${item.id}`,
      } as any;
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
      back_urls: {
        success: `${process.env.SITE_URL}/payment/success`,
        failure: `${process.env.SITE_URL}/payment/failure`,
        pending: `${process.env.SITE_URL}/payment/pending`,
      },
      auto_return: "approved",
      notification_url: `${process.env.SITE_URL}/api/webhooks/mercadopago`,
    };

    const response: any = await this.preference.create({ body: payload });

    if (!response || !response.init_point) {
      throw new InternalServerError("Fallo al crear el link de pago en Mercado Pago");
    }

    return response;
  }
}
