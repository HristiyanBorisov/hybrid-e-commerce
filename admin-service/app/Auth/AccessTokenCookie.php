<?php

namespace App\Auth;

use App\Dto\Auth\AccessTokenDto;
use Symfony\Component\HttpFoundation\Cookie;

/**
 * Creates and clears the login cookie — the session both services share (they're on one domain).
 * Same name and flags as the API gateway sets:
 * - HttpOnly: scripts in the page can't read the token
 * - SameSite=Lax: other websites can't send it along with their POST requests (CSRF)
 * - Secure in production: only sent over HTTPS
 */
final class AccessTokenCookie
{
    public const NAME = 'access_token';

    public function make(AccessTokenDto $token): Cookie
    {
        return cookie(
            name: self::NAME,
            value: $token->accessToken,
            minutes: intdiv($token->expiresIn, 60),
            path: '/',
            secure: (bool) config('gateway.cookie.secure'),
            httpOnly: true,
            sameSite: 'lax',
        );
    }

    public function forget(): Cookie
    {
        return cookie()->forget(self::NAME, '/');
    }
}
