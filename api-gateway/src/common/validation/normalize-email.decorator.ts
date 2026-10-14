import { Transform } from 'class-transformer';

/** Trims and lowercases an email before validation, so "Eve@Example.com " and "eve@example.com" are the same user. */
export function NormalizeEmail(): PropertyDecorator {
  return Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  );
}
