import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Res,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { UserResponseDto } from '../users/dto/user-response.dto.js';
import { User } from '../users/user.entity.js';
import { AuthCookie } from './auth-cookie.js';
import { AuthService } from './auth.service.js';
import { CurrentUser } from './decorators/current-user.decorator.js';
import { Public } from './decorators/public.decorator.js';
import { AuthTokenResponseDto } from './dto/auth-token-response.dto.js';
import { LoginDto } from './dto/login.dto.js';
import { RegisterDto } from './dto/register.dto.js';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly authCookie: AuthCookie,
  ) {}

  /** Create a customer account */
  @Public()
  @Post('register')
  async register(@Body() data: RegisterDto): Promise<UserResponseDto> {
    return UserResponseDto.fromEntity(await this.authService.register(data));
  }

  /** Log in: returns the token and also sets it as an HttpOnly cookie (the session shared with the admin panel) */
  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() credentials: LoginDto,
    @Res({ passthrough: true }) response: Response,
  ): Promise<AuthTokenResponseDto> {
    const token = await this.authService.login(credentials);
    this.authCookie.set(response, token.accessToken);

    return token;
  }

  /** Log out: removes the login cookie */
  @Public()
  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  logout(@Res({ passthrough: true }) response: Response): void {
    this.authCookie.clear(response);
  }

  /** The logged-in user */
  @ApiBearerAuth()
  @Get('me')
  me(@CurrentUser() user: User): UserResponseDto {
    return UserResponseDto.fromEntity(user);
  }
}
