import { Request } from 'express';
import { User } from '../users/user.entity.js';

/** A request that passed JwtAuthGuard: the logged-in user is attached to it. */
export interface AuthenticatedRequest extends Request {
  user: User;
}
