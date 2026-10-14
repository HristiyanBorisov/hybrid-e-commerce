import { UserRole } from '../users/user-role.enum.js';

/**
 * What a login token says about its user. It carries enough for the admin service
 * to know who is logged in without asking this service.
 */
export interface AccessTokenPayload {
  /** User id */
  sub: string;
  email: string;
  name: string;
  role: UserRole;
}
