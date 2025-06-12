export interface PaymentProvider {
  createPaymentLink(params: { id: string; title: string; price: number }): Promise<string>;
}
