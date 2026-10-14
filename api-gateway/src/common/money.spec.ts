import { formatCents } from './money.js';

describe('formatCents', () => {
  it.each([
    [0, '0.00'],
    [5, '0.05'],
    [1999, '19.99'],
    [123450, '1,234.50'],
  ])('shows %i cents as %s', (cents, text) => {
    expect(formatCents(cents)).toBe(text);
  });
});
