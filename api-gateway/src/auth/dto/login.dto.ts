import { IsEmail, IsNotEmpty, IsString } from 'class-validator';
import { NormalizeEmail } from '../../common/validation/normalize-email.decorator.js';

/** Body of POST /auth/login. No password rules here: they'd only tell an attacker what to try. */
export class LoginDto {
  @NormalizeEmail()
  @IsEmail()
  email: string;

  @IsString()
  @IsNotEmpty()
  password: string;
}
