import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { NormalizeEmail } from '../../common/validation/normalize-email.decorator.js';
import { UserRole } from '../user-role.enum.js';

/** Body of POST /users — an admin creates a user with any role. */
export class CreateUserDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string;

  @NormalizeEmail()
  @IsEmail()
  @MaxLength(255)
  email: string;

  /** 8–72 characters (bcrypt ignores everything after 72) */
  @IsString()
  @MinLength(8)
  @MaxLength(72)
  password: string;

  @IsEnum(UserRole)
  role: UserRole;
}
