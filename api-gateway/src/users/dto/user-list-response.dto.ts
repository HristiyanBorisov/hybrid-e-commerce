import { PaginationMetaDto } from '../../common/dto/pagination-meta.dto.js';
import { UserResponseDto } from './user-response.dto.js';

/** Response of GET /users: one page of users plus where that page sits in the whole list. */
export class UserListResponseDto {
  data: UserResponseDto[];
  meta: PaginationMetaDto;
}
