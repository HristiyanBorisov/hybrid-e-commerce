import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '../../users/user-role.enum.js';
import { ROLES_KEY } from '../decorators/roles.decorator.js';
import { requestFrom } from '../request-from-context.js';

/**
 * Runs after JwtAuthGuard (registered globally): checks @Roles(...) on the route or its controller.
 * Routes without @Roles are open to every logged-in user. A wrong role is a 403 — the user is
 * known (that would be a 401) but not allowed.
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const allowedRoles = this.reflector.getAllAndOverride<
      UserRole[] | undefined
    >(ROLES_KEY, [context.getHandler(), context.getClass()]);

    if (!allowedRoles) {
      return true;
    }

    const { user } = requestFrom(context);

    if (!allowedRoles.includes(user.role)) {
      throw new ForbiddenException("You don't have permission to do this");
    }

    return true;
  }
}
