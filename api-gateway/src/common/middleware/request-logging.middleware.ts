import { Injectable, Logger, NestMiddleware } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';
import { randomUUID } from 'node:crypto';

export const REQUEST_ID_HEADER = 'x-request-id';

/** A caller's request id is reused only if it's short and safe to write into the logs */
const VALID_REQUEST_ID = /^[\w-]{1,100}$/;

/**
 * Logs one line per request when the response is sent, e.g.
 * "GET /api/v1/products?page=2 200 14ms (request 0b8f…)".
 *
 * Every request gets an id (the caller's X-Request-Id, or a new one). It's returned in the response
 * header and forwarded to other services, so one id follows a request through the whole platform.
 * Request bodies are never logged: they can contain passwords.
 */
@Injectable()
export class RequestLoggingMiddleware implements NestMiddleware {
  private readonly logger = new Logger('HTTP');

  use(request: Request, response: Response, next: NextFunction): void {
    const startedAt = performance.now();
    const requestId = this.resolveRequestId(request);

    request.headers[REQUEST_ID_HEADER] = requestId;
    response.setHeader(REQUEST_ID_HEADER, requestId);

    response.on('finish', () => {
      const duration = Math.round(performance.now() - startedAt);

      this.log(
        response.statusCode,
        `${request.method} ${request.originalUrl} ${response.statusCode} ${duration}ms (request ${requestId})`,
      );
    });

    next();
  }

  private resolveRequestId(request: Request): string {
    const incoming = request.header(REQUEST_ID_HEADER);

    return incoming && VALID_REQUEST_ID.test(incoming)
      ? incoming
      : randomUUID();
  }

  private log(statusCode: number, message: string): void {
    if (statusCode >= 500) {
      this.logger.error(message);
    } else if (statusCode >= 400) {
      this.logger.warn(message);
    } else {
      this.logger.log(message);
    }
  }
}
