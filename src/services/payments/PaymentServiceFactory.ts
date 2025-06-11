import { MercadoPagoService } from "@/services/payments/MercadoPagoService";
import { PaymentProvider } from "@/entities/PaymentProvider";

export class PaymentServiceFactory {
  static getProvider(provider: string): PaymentProvider {
    switch (provider) {
      case "mercadopago":
        return new MercadoPagoService();
      // case "stripe":
      //   return new StripeService();
      default:
        throw new Error(`Unsupported payment provider: ${provider}`);
    }
  }
}
