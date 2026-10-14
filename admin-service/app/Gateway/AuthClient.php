<?php

namespace App\Gateway;

use App\Dto\Auth\AccessTokenDto;
use App\Dto\Auth\LoginDto;
use App\Exceptions\Gateway\GatewayUnauthorizedException;
use Illuminate\Validation\ValidationException;

/** Login through the API gateway — it checks the password and issues the token. */
final readonly class AuthClient
{
    public function __construct(private GatewayClient $gateway) {}

    /** @throws ValidationException when the email or password is wrong */
    public function login(LoginDto $credentials): AccessTokenDto
    {
        try {
            return AccessTokenDto::fromArray($this->gateway->post('auth/login', [
                'email' => $credentials->email,
                'password' => $credentials->password,
            ]));
        } catch (GatewayUnauthorizedException) {
            // Here a 401 means wrong credentials, not an ended session
            throw ValidationException::withMessages(['email' => __('auth.failed')]);
        }
    }
}
