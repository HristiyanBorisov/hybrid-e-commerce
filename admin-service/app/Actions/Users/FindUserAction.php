<?php

namespace App\Actions\Users;

use App\Dto\Users\UserDto;
use App\Gateway\UsersClient;

final readonly class FindUserAction
{
    public function __construct(private UsersClient $users) {}

    public function execute(string $id): UserDto
    {
        return $this->users->find($id);
    }
}
