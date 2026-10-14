import { QueryFailedError } from 'typeorm';
import { isUniqueViolation } from './is-unique-violation.js';

function queryError(code: string): QueryFailedError {
  return new QueryFailedError(
    'INSERT ...',
    [],
    Object.assign(new Error('failed'), { code }),
  );
}

describe('isUniqueViolation', () => {
  it('recognises a duplicate rejected by a unique constraint (PostgreSQL code 23505)', () => {
    expect(isUniqueViolation(queryError('23505'))).toBe(true);
  });

  it('ignores other database errors', () => {
    expect(isUniqueViolation(queryError('23503'))).toBe(false);
  });

  it('ignores errors that are not database errors', () => {
    expect(isUniqueViolation(new Error('23505'))).toBe(false);
  });
});
