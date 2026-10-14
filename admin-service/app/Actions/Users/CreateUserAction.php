<?php

namespace App\Actions\Users;

use App\Dto\Users\CreateUserDto;
use App\Dto\Users\UserDto;
use App\Gateway\UsersClient;

final readonly class CreateUserAction
{
    public function __construct(private UsersClient $users) {}

    public function execute(CreateUserDto $user): UserDto
    {
        return $this->users->create($user);
    }
}
