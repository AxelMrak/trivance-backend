import { Preference } from "mercadopago";

import { mercadoPagoClient } from "@/config/mercadopago";
import { PaymentProvider } from "@/entities/PaymentProvider";

export class MercadoPagoService implements PaymentProvider {
  private preference = new Preference(mercadoPagoClient);

  async createPaymentLink(item: { id: string; title: string; price: number }): Promise<string> {
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
    };

    const response: any = await this.preference.create({ body: payload });

    if (!response || !response.init_point) {
      throw new Error("Failed to create payment link");
    }

    return response.init_point;
  }
}
