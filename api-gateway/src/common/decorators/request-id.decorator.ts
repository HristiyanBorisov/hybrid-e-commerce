import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';
import { REQUEST_ID_HEADER } from '../middleware/request-logging.middleware.js';

/** The current request's id, to forward to other services. Always set: RequestLoggingMiddleware runs first. */
export const RequestId = createParamDecorator(
  (_data: unknown, context: ExecutionContext): string =>
    context.switchToHttp().getRequest<Request>().headers[
      REQUEST_ID_HEADER
    ] as string,
);
