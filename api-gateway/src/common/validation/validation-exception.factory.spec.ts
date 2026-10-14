import { UnprocessableEntityException } from '@nestjs/common';
import { ValidationError } from 'class-validator';
import { validationExceptionFactory } from './validation-exception.factory.js';

function validationError(
  property: string,
  constraints?: Record<string, string>,
  children: ValidationError[] = [],
): ValidationError {
  return Object.assign(new ValidationError(), {
    property,
    constraints,
    children,
  });
}

describe('validationExceptionFactory', () => {
  it('returns a 422 with the messages grouped by field', () => {
    const exception = validationExceptionFactory([
      validationError('email', { isEmail: 'email must be an email' }),
      validationError('name', {
        isString: 'name must be a string',
        isNotEmpty: 'name should not be empty',
      }),
    ]);

    expect(exception).toBeInstanceOf(UnprocessableEntityException);
    expect(exception.getResponse()).toEqual({
      message: 'Validation failed',
      errors: {
        email: ['email must be an email'],
        name: ['name must be a string', 'name should not be empty'],
      },
    });
  });

  it('handles errors that have no list of children', () => {
    const error = Object.assign(new ValidationError(), {
      property: 'name',
      constraints: { isString: 'name must be a string' },
      children: undefined,
    });

    expect(validationExceptionFactory([error]).getResponse()).toEqual({
      message: 'Validation failed',
      errors: { name: ['name must be a string'] },
    });
  });

  it('gives nested fields a dotted path', () => {
    const exception = validationExceptionFactory([
      validationError('items', undefined, [
        validationError('0', undefined, [
          validationError('quantity', {
            min: 'quantity must not be less than 1',
          }),
        ]),
      ]),
    ]);

    expect(exception.getResponse()).toEqual({
      message: 'Validation failed',
      errors: { 'items.0.quantity': ['quantity must not be less than 1'] },
    });
  });
});
