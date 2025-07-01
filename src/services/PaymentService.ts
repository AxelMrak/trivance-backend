import { Preference } from "mercadopago";

import { mercadoPagoClient } from "@/config/mercadopago";

export class PaymentService {
  private mercadopagoClient = mercadoPagoClient;

  async createPaymentLink(item: { id: string; title: string; price: number }): Promise<any> {
    const preference = new Preference(this.mercadopagoClient);

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
      notification_url: "https://3681-179-36-246-106.ngrok-free.app/api/webhooks/mercadopago",
    };

    const response: any = await preference.create({ body: payload });
    console.log("Payment link created:", response);
    if (!response) {
      console.error("Failed to create payment link:", response);
      throw new Error("Failed to create payment link");
    }

    return response;
  }
}
