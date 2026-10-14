<?php

namespace App\Dto\Users;

use App\Enums\UserRole;

/** A new user, as entered on the "create user" form. */
final readonly class CreateUserDto
{
    public function __construct(
        public string $name,
        public string $email,
        public string $password,
        public UserRole $role,
    ) {}
}
