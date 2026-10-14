import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { PaymentDeclinedException } from './payment-declined.exception.js';
import { PaymentGateway } from './payment-gateway.js';

/** Payment token the mock always declines — to try out a failed payment. Every other token is approved. */
export const DECLINED_TEST_TOKEN = 'tok_declined';

/** A stand-in payment provider: no money moves. */
@Injectable()
export class MockPaymentGateway extends PaymentGateway {
  charge(
    _orderId: string,
    _amountCents: number,
    paymentToken: string,
  ): Promise<string> {
    if (paymentToken === DECLINED_TEST_TOKEN) {
      return Promise.reject(new PaymentDeclinedException());
    }

    return Promise.resolve(`mock_${randomUUID()}`);
  }
}
