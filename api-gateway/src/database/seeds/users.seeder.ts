import { UserRole } from '../../users/user-role.enum.js';
import { UsersService } from '../../users/users.service.js';

/** Every demo user logs in with this password. Demo data only — never use it for real accounts. */
export const DEMO_PASSWORD = 'password';

const DEMO_USERS = [
  { name: 'Admin', email: 'admin@example.com', role: UserRole.Admin },
  {
    name: 'Alice Customer',
    email: 'alice@example.com',
    role: UserRole.Customer,
  },
  { name: 'Bob Customer', email: 'bob@example.com', role: UserRole.Customer },
];

/**
 * Creates the demo users through UsersService, so they're hashed and validated exactly like real users.
 * Users that already exist are skipped: running it again changes nothing.
 */
export class UsersSeeder {
  constructor(private readonly usersService: UsersService) {}

  /** Returns the emails of the users it created. */
  async run(): Promise<string[]> {
    const created: string[] = [];

    for (const user of DEMO_USERS) {
      if (await this.usersService.findByEmail(user.email)) {
        continue;
      }

      await this.usersService.create({ ...user, password: DEMO_PASSWORD });
      created.push(user.email);
    }

    return created;
  }
}
