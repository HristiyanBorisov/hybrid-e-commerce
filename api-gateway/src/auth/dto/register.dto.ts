import {
  IsEmail,
  IsNotEmpty,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { NormalizeEmail } from '../../common/validation/normalize-email.decorator.js';

/** Body of POST /auth/register. There's no role: self-registered users are always customers. */
export class RegisterDto {
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
}
