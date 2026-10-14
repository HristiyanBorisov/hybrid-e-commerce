import { ExecutionContext } from '@nestjs/common';
import { GqlContextType, GqlExecutionContext } from '@nestjs/graphql';
import { AuthenticatedRequest } from './authenticated-request.js';

/**
 * The HTTP request behind a REST call or a GraphQL operation — so the same guards and decorators (login, roles,
 * current user) work for both.
 */
export function requestFrom(context: ExecutionContext): AuthenticatedRequest {
  if (context.getType<GqlContextType>() === 'graphql') {
    return GqlExecutionContext.create(context).getContext<{
      req: AuthenticatedRequest;
    }>().req;
  }

  return context.switchToHttp().getRequest<AuthenticatedRequest>();
}
