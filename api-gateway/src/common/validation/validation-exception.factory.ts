import { UnprocessableEntityException } from '@nestjs/common';
import { ValidationError } from 'class-validator';

/**
 * Turns failed DTO validation into a 422 response with the messages grouped by field —
 * the same shape the Laravel admin service uses. Nested fields get a dotted path, e.g. "items.0.quantity".
 */
export function validationExceptionFactory(
  errors: ValidationError[],
): UnprocessableEntityException {
  return new UnprocessableEntityException({
    message: 'Validation failed',
    errors: collectMessages(errors),
  });
}

function collectMessages(
  errors: ValidationError[],
  parentPath?: string,
): Record<string, string[]> {
  const messages: Record<string, string[]> = {};

  for (const error of errors) {
    const path = parentPath
      ? `${parentPath}.${error.property}`
      : error.property;

    if (error.constraints) {
      messages[path] = Object.values(error.constraints);
    }

    Object.assign(messages, collectMessages(error.children ?? [], path));
  }

  return messages;
}
