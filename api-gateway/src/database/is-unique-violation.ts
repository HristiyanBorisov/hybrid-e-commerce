import { QueryFailedError } from 'typeorm';

const UNIQUE_VIOLATION = '23505';

/**
 * True when a query failed because a unique constraint or index rejected a duplicate.
 * Catching this (instead of checking "does it exist?" first) leaves no gap for two requests to slip through.
 */
export function isUniqueViolation(error: unknown): boolean {
  return (
    error instanceof QueryFailedError &&
    (error.driverError as { code?: string }).code === UNIQUE_VIOLATION
  );
}
