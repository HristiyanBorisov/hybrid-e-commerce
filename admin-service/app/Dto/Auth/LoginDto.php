<?php

namespace App\Dto\Auth;

/** The credentials from the login form. */
final readonly class LoginDto
{
    public function __construct(
        public string $email,
        public string $password,
    ) {}
}
