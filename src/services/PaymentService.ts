import { Preference } from "mercadopago";

import { mercadoPagoClient } from "@/config/mercadopago";

export class PaymentService {
  private mercadopagoClientPromise = mercadoPagoClient();

  async createPaymentLink(item: { id: string; title: string; price: number }): Promise<string> {
    const mercadopago = await this.mercadopagoClientPromise;
    const preference = new Preference(mercadopago);

    const payload = {
      items: [
        {
          id: item.id,
          title: item.title,
          quantity: 1,
          unit_price: item.price,
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

    try {
      const response: any = await preference.create({
        body: payload,
      });

      if (response.status !== 201) {
        throw new Error(`Mercado Pago error: status ${response.status}`);
      }

      return response.body.init_point;
    } catch (error) {
      console.error("Error creating Mercado Pago preference", error);
      throw new Error("Failed to create payment link");
    }
  }

  async verifyPayment(paymentId: string) {}
}
