import { HttpException, HttpStatus } from '@nestjs/common';

/** The payment provider refused the payment → 402. */
export class PaymentDeclinedException extends HttpException {
  constructor() {
    super('Payment declined', HttpStatus.PAYMENT_REQUIRED);
  }
}
