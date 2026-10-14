import { plainToInstance } from 'class-transformer';
import { NormalizeEmail } from './normalize-email.decorator.js';

class Example {
  @NormalizeEmail()
  email: unknown;
}

describe('@NormalizeEmail', () => {
  it('trims and lowercases an email', () => {
    expect(
      plainToInstance(Example, { email: '  Eve@Example.COM ' }).email,
    ).toBe('eve@example.com');
  });

  it('leaves anything that is not text alone, so validation can reject it', () => {
    expect(plainToInstance(Example, { email: 42 }).email).toBe(42);
  });
});
