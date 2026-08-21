import { Preference } from "mercadopago";

import { mercadoPagoClient } from "@/config/mercadopago";
import { PaymentProvider, PaymentData, PaymentStatus } from "@/entities/PaymentProvider";
import { getPaymentResource } from "@/services/payments/mercadopagoClient";
import { toCents } from "@/utils/money";
import { InternalServerError } from "@/errors/httpErrors";
import { config, isTest, DEFAULT_PAYMENT_CURRENCY } from "@/config/env";

const PAYMENT_FETCH_TIMEOUT_MS = 10_000;

/**
 * Bounds a promise with a wall-clock timeout. The underlying work is NOT
 * cancelled — only the caller's await is released with a timeout error. Safe
 * only for side-effect-free calls (like a plain HTTP fetch).
 */
function withTimeout<T>(fn: () => Promise<T>, ms: number, message: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(message)), ms);
  });
  return Promise.race([fn(), timeoutPromise]).finally(() => {
    if (timer) clearTimeout(timer);
  });
}

export class MercadoPagoService implements PaymentProvider {
  private preference = new Preference(mercadoPagoClient);

  async getPayment(id: string): Promise<PaymentData | null> {
    const payment = await withTimeout(
      () => getPaymentResource().get({ id }),
      PAYMENT_FETCH_TIMEOUT_MS,
      "Mercado Pago getPayment timed out",
    );
    if (!payment || !payment.status || !payment.external_reference) {
      return null;
    }
    if (payment.transaction_amount == null || payment.currency_id == null) {
      return null;
    }
    return {
      id: String(payment.id),
      status: payment.status as PaymentStatus,
      externalReference: payment.external_reference,
      transactionAmountCents: toCents(payment.transaction_amount),
      currencyId: payment.currency_id,
      liveMode: payment.live_mode === true,
    };
  }

  async createPaymentLink(item: {
    id: string;
    title: string;
    price: number;
    orderId: string;
  }): Promise<string> {
    // In tests, avoid external network calls and return a deterministic stub
    if (isTest) {
      return {
        id: `test-pref-${item.id}`,
        init_point: `https://payments.example.test/pay/${item.id}`,
      } as any;
    }
    const siteUrl = config.SITE_URL;

    const payload = {
      items: [
        {
          id: item.id,
          title: item.title,
          quantity: 1,
          unit_price: Number(item.price),
          currency_id: DEFAULT_PAYMENT_CURRENCY,
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
