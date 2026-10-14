/** Cents as an amount for people to read: 123450 → "1,234.50". One currency is assumed. */
export function formatCents(cents: number): string {
  return (cents / 100).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}
