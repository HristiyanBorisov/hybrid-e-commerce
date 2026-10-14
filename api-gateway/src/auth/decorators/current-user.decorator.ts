import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { User } from '../../users/user.entity.js';
import { requestFrom } from '../request-from-context.js';

/** The logged-in user, e.g. `me(@CurrentUser() user: User)` — in REST controllers and GraphQL resolvers. */
export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): User =>
    requestFrom(context).user,
);
