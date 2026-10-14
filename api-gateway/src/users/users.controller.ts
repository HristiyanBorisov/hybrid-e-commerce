import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { PaginationMetaDto } from '../common/dto/pagination-meta.dto.js';
import { CreateUserDto } from './dto/create-user.dto.js';
import { ListUsersQueryDto } from './dto/list-users-query.dto.js';
import { UpdateUserDto } from './dto/update-user.dto.js';
import { UserListResponseDto } from './dto/user-list-response.dto.js';
import { UserResponseDto } from './dto/user-response.dto.js';
import { User } from './user.entity.js';
import { UserRole } from './user-role.enum.js';
import { UsersService } from './users.service.js';

/** User management for admins — used by the admin panel's user screens. */
@ApiTags('users')
@ApiBearerAuth()
@Roles(UserRole.Admin)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  /** List users, newest first */
  @Get()
  async list(@Query() query: ListUsersQueryDto): Promise<UserListResponseDto> {
    const [users, total] = await this.usersService.list(query);

    return {
      data: users.map((user) => UserResponseDto.fromEntity(user)),
      meta: PaginationMetaDto.of(query, total),
    };
  }

  /** Get one user */
  @Get(':id')
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<UserResponseDto> {
    return UserResponseDto.fromEntity(await this.usersService.findById(id));
  }

  /** Create a user with any role */
  @Post()
  async create(@Body() data: CreateUserDto): Promise<UserResponseDto> {
    return UserResponseDto.fromEntity(await this.usersService.create(data));
  }

  /** Change some of a user's fields. Admins can't change their own role. */
  @Patch(':id')
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() changes: UpdateUserDto,
    @CurrentUser() admin: User,
  ): Promise<UserResponseDto> {
    return UserResponseDto.fromEntity(
      await this.usersService.update(id, changes, admin.id),
    );
  }

  /** Soft-delete a user. Admins can't delete themselves. */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() admin: User,
  ): Promise<void> {
    await this.usersService.remove(id, admin.id);
  }
}
