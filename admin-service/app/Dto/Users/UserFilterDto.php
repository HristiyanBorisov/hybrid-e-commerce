<?php

namespace App\Dto\Users;

use App\Enums\UserRole;

/** Which page of the user list to show, and how to filter it. */
final readonly class UserFilterDto
{
    public const PER_PAGE = 20;

    public function __construct(
        public int $page = 1,
        /** Part of a name or email */
        public ?string $search = null,
        public ?UserRole $role = null,
    ) {}
}
