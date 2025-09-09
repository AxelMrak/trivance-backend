export interface PaymentProvider {
  createPaymentLink(params: {
    id: string;
    title: string;
    price: number;
    orderId: string;
  }): Promise<string>;
}
