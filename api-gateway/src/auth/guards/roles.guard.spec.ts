import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { User } from '../../users/user.entity.js';
import { UserRole } from '../../users/user-role.enum.js';
import { Roles } from '../decorators/roles.decorator.js';
import { RolesGuard } from './roles.guard.js';

class ExampleController {
  anyLoggedInUser(): void {}

  @Roles(UserRole.Admin)
  adminsOnly(): void {}
}

@Roles(UserRole.Admin)
class AdminController {
  list(): void {}
}

describe('RolesGuard', () => {
  const guard = new RolesGuard(new Reflector());

  function contextFor(
    role: UserRole,
    handler: () => void,
    controller: object = ExampleController,
  ): ExecutionContext {
    return {
      getType: () => 'http',
      getHandler: () => handler,
      getClass: () => controller,
      switchToHttp: () => ({
        getRequest: () => ({ user: Object.assign(new User(), { role }) }),
      }),
    } as unknown as ExecutionContext;
  }

  it('lets every logged-in user through when the route has no @Roles', () => {
    expect(
      guard.canActivate(
        contextFor(
          UserRole.Customer,
          ExampleController.prototype.anyLoggedInUser,
        ),
      ),
    ).toBe(true);
  });

  it('lets a user with an allowed role through', () => {
    expect(
      guard.canActivate(
        contextFor(UserRole.Admin, ExampleController.prototype.adminsOnly),
      ),
    ).toBe(true);
  });

  it('answers a user without an allowed role with 403', () => {
    expect(() =>
      guard.canActivate(
        contextFor(UserRole.Customer, ExampleController.prototype.adminsOnly),
      ),
    ).toThrow(ForbiddenException);
  });

  it('applies @Roles on a controller to all of its routes', () => {
    expect(() =>
      guard.canActivate(
        contextFor(
          UserRole.Customer,
          AdminController.prototype.list,
          AdminController,
        ),
      ),
    ).toThrow(ForbiddenException);
  });
});
