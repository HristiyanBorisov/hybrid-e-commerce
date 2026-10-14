import { SetMetadata } from '@nestjs/common';
import { UserRole } from '../../users/user-role.enum.js';

export const ROLES_KEY = 'roles';

/** Only users with one of these roles may call the route, e.g. `@Roles(UserRole.Admin)`. */
export const Roles = (...roles: UserRole[]): MethodDecorator & ClassDecorator =>
  SetMetadata(ROLES_KEY, roles);
