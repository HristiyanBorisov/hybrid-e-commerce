<?php

namespace App\Dto\Users;

use App\Enums\UserRole;

/** Changes to a user, as entered on the "edit user" form. */
final readonly class UpdateUserDto
{
    public function __construct(
        public string $name,
        public string $email,
        public UserRole $role,
        /** Null keeps the current password */
        public ?string $password = null,
    ) {}
}
