import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { GqlContextType } from '@nestjs/graphql';
import { Response } from 'express';
import { GraphQLError } from 'graphql';
import { ErrorResponseDto } from '../dto/error-response.dto.js';

/** Fields Nest and our validation factory put into an HttpException's response object */
interface HttpExceptionBody {
  message?: string | string[];
  errors?: Record<string, string[]>;
}

/**
 * Catches every error and answers with the same format: { statusCode, message, errors? }.
 * Unexpected errors become a plain 500 — their details go to the logs, never to the client.
 *
 * GraphQL answers errors inside its own response ({ data, errors }), so there the same details go into the
 * error's "extensions": { code: "NOT_FOUND", statusCode: 404, errors? }.
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): GraphQLError | void {
    const body = this.toErrorResponse(exception);

    if (body.statusCode >= HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logger.error(
        exception instanceof Error ? exception.stack : String(exception),
      );
    }

    if (host.getType<GqlContextType>() === 'graphql') {
      return new GraphQLError(body.message, {
        extensions: {
          code: HttpStatus[body.statusCode],
          statusCode: body.statusCode,
          ...(body.errors && { errors: body.errors }),
        },
      });
    }

    host
      .switchToHttp()
      .getResponse<Response>()
      .status(body.statusCode)
      .json(body);
  }

  private toErrorResponse(exception: unknown): ErrorResponseDto {
    if (!(exception instanceof HttpException)) {
      return {
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'Internal server error',
      };
    }

    const statusCode = exception.getStatus();
    const response = exception.getResponse();

    if (typeof response === 'string') {
      return { statusCode, message: response };
    }

    const { message, errors } = response as HttpExceptionBody;

    return {
      statusCode,
      message: Array.isArray(message)
        ? message.join(', ')
        : (message ?? exception.message),
      ...(errors && { errors }),
    };
  }
}
