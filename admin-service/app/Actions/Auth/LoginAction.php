<?php

namespace App\Actions\Auth;

use App\Auth\AccessTokenVerifier;
use App\Dto\Auth\AccessTokenDto;
use App\Dto\Auth\LoginDto;
use App\Gateway\AuthClient;
use Illuminate\Validation\ValidationException;

/** Logs an admin in: the API gateway checks the password, this app accepts only admins. */
final readonly class LoginAction
{
    public function __construct(
        private AuthClient $auth,
        private AccessTokenVerifier $verifier,
    ) {}

    /** @throws ValidationException when the credentials are wrong or don't belong to an admin */
    public function execute(LoginDto $credentials): AccessTokenDto
    {
        $token = $this->auth->login($credentials);

        if (! $this->verifier->verify($token->accessToken)->isAdmin()) {
            throw ValidationException::withMessages([
                'email' => __("These credentials don't belong to an admin account."),
            ]);
        }

        return $token;
    }
}
