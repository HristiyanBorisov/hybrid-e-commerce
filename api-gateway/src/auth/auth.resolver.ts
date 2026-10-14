import { Query, Resolver } from '@nestjs/graphql';
import { UserResponseDto } from '../users/dto/user-response.dto.js';
import { User } from '../users/user.entity.js';
import { CurrentUser } from './decorators/current-user.decorator.js';

/** The logged-in user in GraphQL. Logging in stays REST: POST /api/v1/auth/login sets the cookie or returns the token. */
@Resolver(() => UserResponseDto)
export class AuthResolver {
  @Query(() => UserResponseDto, { description: 'The logged-in user' })
  me(@CurrentUser() user: User): UserResponseDto {
    return UserResponseDto.fromEntity(user);
  }
}
