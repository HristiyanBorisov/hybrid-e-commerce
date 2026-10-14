import {
  ArgumentsHost,
  BadRequestException,
  HttpException,
  HttpStatus,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { GraphQLError } from 'graphql';
import { AllExceptionsFilter } from './all-exceptions.filter.js';

describe('AllExceptionsFilter', () => {
  const filter = new AllExceptionsFilter();
  const response = { status: vi.fn().mockReturnThis(), json: vi.fn() };
  const host = {
    getType: () => 'http',
    switchToHttp: () => ({ getResponse: () => response }),
  } as unknown as ArgumentsHost;
  const graphqlHost = { getType: () => 'graphql' } as unknown as ArgumentsHost;
  let logError: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    logError = vi
      .spyOn(Logger.prototype, 'error')
      .mockImplementation(() => undefined);
  });

  function sentResponse(): { status: number; body: unknown } {
    return {
      status: response.status.mock.calls[0][0],
      body: response.json.mock.calls[0][0],
    };
  }

  it('keeps the status and message of HTTP errors', () => {
    filter.catch(new NotFoundException('Product not found'), host);

    expect(sentResponse()).toEqual({
      status: 404,
      body: { statusCode: 404, message: 'Product not found' },
    });
    expect(logError).not.toHaveBeenCalled();
  });

  it('passes validation errors through', () => {
    const errors = { email: ['email must be an email'] };

    filter.catch(
      new UnprocessableEntityException({
        message: 'Validation failed',
        errors,
      }),
      host,
    );

    expect(sentResponse().body).toEqual({
      statusCode: 422,
      message: 'Validation failed',
      errors,
    });
  });

  it('joins a list of messages into one', () => {
    filter.catch(
      new BadRequestException(['first problem', 'second problem']),
      host,
    );

    expect(sentResponse().body).toEqual({
      statusCode: 400,
      message: 'first problem, second problem',
    });
  });

  it('uses the response text when an HTTP error was created with a plain string', () => {
    filter.catch(
      new HttpException('I am a teapot', HttpStatus.I_AM_A_TEAPOT),
      host,
    );

    expect(sentResponse().body).toEqual({
      statusCode: 418,
      message: 'I am a teapot',
    });
  });

  it('falls back to the exception message when the response object has none', () => {
    filter.catch(
      new HttpException({ reason: 'custom' }, HttpStatus.CONFLICT),
      host,
    );

    expect(sentResponse().body).toEqual({
      statusCode: 409,
      message: 'Http Exception',
    });
  });

  it('hides unexpected errors behind a plain 500 and logs the details', () => {
    filter.catch(new Error('connection to secret-db-host refused'), host);

    expect(sentResponse()).toEqual({
      status: 500,
      body: { statusCode: 500, message: 'Internal server error' },
    });
    expect(logError).toHaveBeenCalledWith(
      expect.stringContaining('secret-db-host'),
    );
  });

  it('logs non-Error values that were thrown', () => {
    filter.catch('something odd', host);

    expect(sentResponse().status).toBe(500);
    expect(logError).toHaveBeenCalledWith('something odd');
  });

  it('logs HTTP errors in the 5xx range too', () => {
    filter.catch(
      new ServiceUnavailableException('Payment provider is down'),
      host,
    );

    expect(sentResponse().body).toEqual({
      statusCode: 503,
      message: 'Payment provider is down',
    });
    expect(logError).toHaveBeenCalled();
  });

  describe('in GraphQL', () => {
    it('answers with a GraphQL error carrying the same code, status and validation errors', () => {
      const errors = { limit: ['limit must not be greater than 100'] };

      const error = filter.catch(
        new UnprocessableEntityException({
          message: 'Validation failed',
          errors,
        }),
        graphqlHost,
      );

      expect(error).toBeInstanceOf(GraphQLError);
      expect(error?.message).toBe('Validation failed');
      expect(error?.extensions).toEqual({
        code: 'UNPROCESSABLE_ENTITY',
        statusCode: 422,
        errors,
      });
    });

    it('hides unexpected errors from the client, like REST', () => {
      const error = filter.catch(
        new Error('connection to db lost'),
        graphqlHost,
      );

      expect(error?.message).toBe('Internal server error');
      expect(error?.extensions).toEqual({
        code: 'INTERNAL_SERVER_ERROR',
        statusCode: 500,
      });
      expect(logError).toHaveBeenCalled();
    });
  });
});
