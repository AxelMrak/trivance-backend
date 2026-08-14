import { Cents } from "@/utils/money";

export type PaymentStatus =
  | "approved"
  | "rejected"
  | "refused"
  | "chargeback"
  | "in_process"
  | "pending"
  | "cancelled";

export interface PaymentData {
  id: string;
  status: PaymentStatus;
  externalReference: string;
  transactionAmountCents: Cents;
  currencyId: string;
  liveMode: boolean;
}

export interface PaymentProvider {
  createPaymentLink(params: {
    id: string;
    title: string;
    price: number;
    orderId: string;
  }): Promise<string>;
  getPayment(id: string): Promise<PaymentData | null>;
}
