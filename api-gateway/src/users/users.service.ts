import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, ILike, Repository } from 'typeorm';
import { pageOptions } from '../common/pagination.js';
import { isUniqueViolation } from '../database/is-unique-violation.js';
import { CreateUserDto } from './dto/create-user.dto.js';
import { ListUsersQueryDto } from './dto/list-users-query.dto.js';
import { UpdateUserDto } from './dto/update-user.dto.js';
import { PasswordHasher } from './password-hasher.js';
import { User } from './user.entity.js';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
    private readonly passwordHasher: PasswordHasher,
  ) {}

  async create(data: CreateUserDto): Promise<User> {
    const user = this.users.create({
      name: data.name,
      email: data.email,
      role: data.role,
      passwordHash: await this.passwordHasher.hash(data.password),
    });

    return this.save(user);
  }

  /** Throws 404 when the user doesn't exist or was deleted. */
  async findById(id: string): Promise<User> {
    const user = await this.users.findOneBy({ id });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  /** Returns null instead of throwing — for login and token checks, where a missing user is a 401. */
  findByIdOrNull(id: string): Promise<User | null> {
    return this.users.findOneBy({ id });
  }

  findByEmail(email: string): Promise<User | null> {
    return this.users.findOneBy({ email });
  }

  /** One page of users, newest first, optionally filtered by role and a search in name or email. */
  async list(query: ListUsersQueryDto): Promise<[User[], number]> {
    const role = query.role ? { role: query.role } : {};
    const where: FindOptionsWhere<User>[] = query.search
      ? [
          { ...role, name: ILike(`%${query.search}%`) },
          { ...role, email: ILike(`%${query.search}%`) },
        ]
      : [role];

    return this.users.findAndCount({
      where,
      order: { createdAt: 'DESC' },
      ...pageOptions(query),
    });
  }

  async update(
    id: string,
    changes: UpdateUserDto,
    actingUserId: string,
  ): Promise<User> {
    const user = await this.findById(id);

    if (id === actingUserId && changes.role && changes.role !== user.role) {
      throw new ForbiddenException("You can't change your own role");
    }

    if (changes.name) user.name = changes.name;
    if (changes.email) user.email = changes.email;
    if (changes.role) user.role = changes.role;
    if (changes.password) {
      user.passwordHash = await this.passwordHasher.hash(changes.password);
    }

    return this.save(user);
  }

  /** Soft delete: the user can't log in anymore, but their orders stay intact. */
  async remove(id: string, actingUserId: string): Promise<void> {
    if (id === actingUserId) {
      throw new ForbiddenException("You can't delete your own account");
    }

    await this.users.softRemove(await this.findById(id));
  }

  private async save(user: User): Promise<User> {
    try {
      return await this.users.save(user);
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new ConflictException('Email is already registered');
      }
      throw error;
    }
  }
}
