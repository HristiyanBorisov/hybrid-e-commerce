import {
  DECLINED_TEST_TOKEN,
  MockPaymentGateway,
} from './mock-payment-gateway.js';
import { PaymentDeclinedException } from './payment-declined.exception.js';

describe('MockPaymentGateway', () => {
  const gateway = new MockPaymentGateway();

  it('approves a payment and returns a reference', async () => {
    await expect(gateway.charge('order-id', 1999, 'tok_visa')).resolves.toMatch(
      /^mock_[\w-]+$/,
    );
  });

  it('declines the test token with a 402', async () => {
    const error = await gateway
      .charge('order-id', 1999, DECLINED_TEST_TOKEN)
      .catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(PaymentDeclinedException);
    expect((error as PaymentDeclinedException).getStatus()).toBe(402);
  });
});
