<?php

namespace App\Actions\Users;

use App\Dto\Users\UpdateUserDto;
use App\Dto\Users\UserDto;
use App\Gateway\UsersClient;

/** The gateway enforces the rules, e.g. admins can't change their own role. */
final readonly class UpdateUserAction
{
    public function __construct(private UsersClient $users) {}

    public function execute(string $id, UpdateUserDto $changes): UserDto
    {
        return $this->users->update($id, $changes);
    }
}
