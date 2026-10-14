import { Module } from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { authConfig } from '../config/auth.config.js';
import { UsersModule } from '../users/users.module.js';
import { AccessTokenVerifier } from './access-token-verifier.js';
import { AuthCookie } from './auth-cookie.js';
import { AuthController } from './auth.controller.js';
import { AuthResolver } from './auth.resolver.js';
import { AuthService } from './auth.service.js';
import { JwtAuthGuard } from './guards/jwt-auth.guard.js';
import { RolesGuard } from './guards/roles.guard.js';

@Module({
  imports: [
    UsersModule,
    JwtModule.registerAsync({
      inject: [authConfig.KEY],
      useFactory: (auth: ConfigType<typeof authConfig>) => ({
        privateKey: auth.privateKey,
        publicKey: auth.publicKey,
        signOptions: {
          algorithm: 'RS256',
          expiresIn: auth.tokenTtlSeconds,
          issuer: auth.issuer,
        },
        // Only RS256 is accepted, so a token can't trick the check into using another algorithm
        verifyOptions: { algorithms: ['RS256'], issuer: auth.issuer },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    AuthCookie,
    AccessTokenVerifier,
    AuthResolver,
    // Global guards run in this order: first "is there a valid login?", then "is the role allowed?"
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
  // WebSocket connections log in with the same token
  exports: [AccessTokenVerifier],
})
export class AuthModule {}
