<?php

namespace App\Auth;

use Illuminate\Http\Request;

/**
 * Finds the logged-in user from the shared login cookie (registered as the "jwt-cookie" auth driver).
 * A missing, expired or forged token simply means "not logged in".
 */
final readonly class JwtCookieAuthenticator
{
    public function __construct(private AccessTokenVerifier $verifier) {}

    public function __invoke(Request $request): ?GatewayUser
    {
        $token = $request->cookie(AccessTokenCookie::NAME);

        if (! is_string($token) || $token === '') {
            return null;
        }

        try {
            return $this->verifier->verify($token);
        } catch (InvalidAccessTokenException) {
            return null;
        }
    }
}
