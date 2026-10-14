import { User } from '../../users/user.entity.js';
import { UserRole } from '../../users/user-role.enum.js';
import { UsersService } from '../../users/users.service.js';
import { DEMO_PASSWORD, UsersSeeder } from './users.seeder.js';

describe('UsersSeeder', () => {
  const usersService = { findByEmail: vi.fn(), create: vi.fn() };
  const seeder = new UsersSeeder(usersService as unknown as UsersService);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates the admin and the demo customers through UsersService', async () => {
    usersService.findByEmail.mockResolvedValue(null);

    const created = await seeder.run();

    expect(created).toEqual([
      'admin@example.com',
      'alice@example.com',
      'bob@example.com',
    ]);
    expect(usersService.create).toHaveBeenCalledWith({
      name: 'Admin',
      email: 'admin@example.com',
      role: UserRole.Admin,
      password: DEMO_PASSWORD,
    });
  });

  it('skips users that already exist, so running it again changes nothing', async () => {
    usersService.findByEmail.mockResolvedValue(new User());

    await expect(seeder.run()).resolves.toEqual([]);
    expect(usersService.create).not.toHaveBeenCalled();
  });
});
