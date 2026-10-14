import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto.js';
import { UserRole } from '../user-role.enum.js';

/** Query of GET /users: ?page=&limit=&search=&role= */
export class ListUsersQueryDto extends PaginationQueryDto {
  /** Part of a name or email (case-insensitive) */
  @IsOptional()
  @IsString()
  @MaxLength(100)
  search?: string;

  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;
}
