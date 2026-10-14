import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { authConfig } from '../config/auth.config.js';
import { PasswordHasher } from '../users/password-hasher.js';
import { User } from '../users/user.entity.js';
import { UserRole } from '../users/user-role.enum.js';
import { UsersService } from '../users/users.service.js';
import { AccessTokenPayload } from './access-token-payload.js';
import { AuthTokenResponseDto } from './dto/auth-token-response.dto.js';
import { LoginDto } from './dto/login.dto.js';
import { RegisterDto } from './dto/register.dto.js';

/**
 * A real bcrypt hash of a random value. Logins with an unknown email are checked against it,
 * so they take as long as logins with a known email — the response time can't reveal which emails exist.
 */
const DUMMY_PASSWORD_HASH =
  '$2b$12$ch2tIlLV14cbN4fG2i7L6.EfW.kJES6fdp8veaz67R8wQo4dTe2IO';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly passwordHasher: PasswordHasher,
    private readonly jwtService: JwtService,
    @Inject(authConfig.KEY)
    private readonly config: ConfigType<typeof authConfig>,
  ) {}

  /** Self-registration always creates a customer. */
  register(data: RegisterDto): Promise<User> {
    return this.usersService.create({
      name: data.name,
      email: data.email,
      password: data.password,
      role: UserRole.Customer,
    });
  }

  async login(credentials: LoginDto): Promise<AuthTokenResponseDto> {
    const user = await this.usersService.findByEmail(credentials.email);
    const passwordMatches = await this.passwordHasher.verify(
      credentials.password,
      user?.passwordHash ?? DUMMY_PASSWORD_HASH,
    );

    if (!user || !passwordMatches) {
      throw new UnauthorizedException('Invalid email or password');
    }

    return this.issueToken(user);
  }

  private async issueToken(user: User): Promise<AuthTokenResponseDto> {
    const payload: AccessTokenPayload = {
      sub: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    };

    return {
      accessToken: await this.jwtService.signAsync(payload),
      tokenType: 'Bearer',
      expiresIn: this.config.tokenTtlSeconds,
    };
  }
}
