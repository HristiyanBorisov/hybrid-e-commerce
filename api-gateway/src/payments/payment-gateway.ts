/**
 * A payment provider, injected by this class. The app uses MockPaymentGateway; a real provider
 * (Stripe, Adyen …) would be another implementation, registered in PaymentsModule.
 */
export abstract class PaymentGateway {
  /**
   * Charges the amount and returns the provider's payment reference.
   * Throws PaymentDeclinedException when the payment is refused.
   */
  abstract charge(
    orderId: string,
    amountCents: number,
    paymentToken: string,
  ): Promise<string>;
}
