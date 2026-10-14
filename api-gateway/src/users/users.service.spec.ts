import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { ILike, QueryFailedError, Repository } from 'typeorm';
import { ListUsersQueryDto } from './dto/list-users-query.dto.js';
import { PasswordHasher } from './password-hasher.js';
import { User } from './user.entity.js';
import { UserRole } from './user-role.enum.js';
import { UsersService } from './users.service.js';

function existingUser(overrides: Partial<User> = {}): User {
  return Object.assign(new User(), {
    name: 'Eve',
    email: 'eve@example.com',
    passwordHash: 'old-hash',
    role: UserRole.Customer,
    ...overrides,
  });
}

function duplicateKeyError(): QueryFailedError {
  return new QueryFailedError(
    'INSERT ...',
    [],
    Object.assign(new Error('duplicate'), { code: '23505' }),
  );
}

describe('UsersService', () => {
  const repository = {
    create: vi.fn((data: Partial<User>) => Object.assign(new User(), data)),
    save: vi.fn((user: User) => Promise.resolve(user)),
    findOneBy: vi.fn(),
    findAndCount: vi.fn(),
    softRemove: vi.fn(),
  };
  const passwordHasher = { hash: vi.fn().mockResolvedValue('new-hash') };
  const service = new UsersService(
    repository as unknown as Repository<User>,
    passwordHasher as unknown as PasswordHasher,
  );

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('create', () => {
    it('stores the hashed password, never the password itself', async () => {
      const user = await service.create({
        name: 'Eve',
        email: 'eve@example.com',
        password: 'secret-password',
        role: UserRole.Admin,
      });

      expect(passwordHasher.hash).toHaveBeenCalledWith('secret-password');
      expect(user).toMatchObject({
        email: 'eve@example.com',
        role: UserRole.Admin,
        passwordHash: 'new-hash',
      });
      expect(JSON.stringify(user)).not.toContain('secret-password');
    });

    it('answers a duplicate email with 409', async () => {
      repository.save.mockRejectedValueOnce(duplicateKeyError());

      await expect(
        service.create({
          name: 'Eve',
          email: 'eve@example.com',
          password: 'secret-password',
          role: UserRole.Customer,
        }),
      ).rejects.toThrow(new ConflictException('Email is already registered'));
    });

    it('lets other database errors through', async () => {
      repository.save.mockRejectedValueOnce(new Error('connection lost'));

      await expect(
        service.create({
          name: 'Eve',
          email: 'eve@example.com',
          password: 'secret-password',
          role: UserRole.Customer,
        }),
      ).rejects.toThrow('connection lost');
    });
  });

  describe('findById', () => {
    it('returns the user', async () => {
      const user = existingUser();
      repository.findOneBy.mockResolvedValueOnce(user);

      await expect(service.findById(user.id)).resolves.toBe(user);
    });

    it('throws 404 for a missing or deleted user', async () => {
      repository.findOneBy.mockResolvedValueOnce(null);

      await expect(
        service.findById('0199e3a0-0000-7000-8000-000000000000'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('list', () => {
    function query(values: Partial<ListUsersQueryDto>): ListUsersQueryDto {
      return Object.assign(new ListUsersQueryDto(), values);
    }

    it('returns one page, newest first', async () => {
      repository.findAndCount.mockResolvedValueOnce([[], 0]);

      await service.list(query({ page: 3, limit: 10 }));

      expect(repository.findAndCount).toHaveBeenCalledWith({
        where: [{}],
        order: { createdAt: 'DESC' },
        skip: 20,
        take: 10,
      });
    });

    it('searches name or email and filters by role', async () => {
      repository.findAndCount.mockResolvedValueOnce([[], 0]);

      await service.list(query({ search: 'eve', role: UserRole.Admin }));

      expect(repository.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({
          where: [
            { role: UserRole.Admin, name: ILike('%eve%') },
            { role: UserRole.Admin, email: ILike('%eve%') },
          ],
        }),
      );
    });
  });

  describe('update', () => {
    it('changes only the fields that were sent and re-hashes a new password', async () => {
      const user = existingUser();
      repository.findOneBy.mockResolvedValueOnce(user);

      const updated = await service.update(
        user.id,
        { name: 'Eve Adams', password: 'another-password' },
        'admin-id',
      );

      expect(updated).toMatchObject({
        name: 'Eve Adams',
        email: 'eve@example.com',
        passwordHash: 'new-hash',
      });
      expect(passwordHasher.hash).toHaveBeenCalledWith('another-password');
    });

    it('changes email and role', async () => {
      const user = existingUser();
      repository.findOneBy.mockResolvedValueOnce(user);

      const updated = await service.update(
        user.id,
        { email: 'eve@new.example', role: UserRole.Admin },
        'admin-id',
      );

      expect(updated).toMatchObject({
        email: 'eve@new.example',
        role: UserRole.Admin,
        passwordHash: 'old-hash',
      });
      expect(passwordHasher.hash).not.toHaveBeenCalled();
    });

    it("doesn't let admins change their own role", async () => {
      const admin = existingUser({ role: UserRole.Admin });
      repository.findOneBy.mockResolvedValueOnce(admin);

      await expect(
        service.update(admin.id, { role: UserRole.Customer }, admin.id),
      ).rejects.toThrow(
        new ForbiddenException("You can't change your own role"),
      );
    });

    it('lets admins edit the rest of their own account', async () => {
      const admin = existingUser({ role: UserRole.Admin });
      repository.findOneBy.mockResolvedValueOnce(admin);

      const updated = await service.update(
        admin.id,
        { name: 'Boss', role: UserRole.Admin },
        admin.id,
      );

      expect(updated.name).toBe('Boss');
    });

    it('answers a taken email with 409', async () => {
      repository.findOneBy.mockResolvedValueOnce(existingUser());
      repository.save.mockRejectedValueOnce(duplicateKeyError());

      await expect(
        service.update('some-id', { email: 'taken@example.com' }, 'admin-id'),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('remove', () => {
    it('soft-deletes the user', async () => {
      const user = existingUser();
      repository.findOneBy.mockResolvedValueOnce(user);

      await service.remove(user.id, 'admin-id');

      expect(repository.softRemove).toHaveBeenCalledWith(user);
    });

    it("doesn't let admins delete themselves", async () => {
      await expect(service.remove('admin-id', 'admin-id')).rejects.toThrow(
        new ForbiddenException("You can't delete your own account"),
      );
      expect(repository.softRemove).not.toHaveBeenCalled();
    });
  });
});
