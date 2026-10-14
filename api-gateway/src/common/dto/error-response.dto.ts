/** The single error format of the API. */
export class ErrorResponseDto {
  /** HTTP status code */
  statusCode: number;

  /** What went wrong */
  message: string;

  /**
   * Validation errors grouped by field (422 responses only)
   * @example { "email": ["email must be an email"], "items.0.quantity": ["quantity must not be less than 1"] }
   */
  errors?: Record<string, string[]>;
}
