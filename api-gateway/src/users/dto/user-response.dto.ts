import { Field, ID, ObjectType } from '@nestjs/graphql';
import { User } from '../user.entity.js';
import { UserRole } from '../user-role.enum.js';

/** A user as the API returns it. The password hash is never copied here, so it can't leak. */
@ObjectType('User')
export class UserResponseDto {
  @Field(() => ID)
  id: string;

  @Field()
  name: string;

  @Field()
  email: string;

  @Field(() => UserRole)
  role: UserRole;

  @Field()
  createdAt: Date;

  static fromEntity(user: User): UserResponseDto {
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      createdAt: user.createdAt,
    };
  }
}
