<?php

namespace App\Actions\Users;

use App\Dto\Users\UserFilterDto;
use App\Dto\Users\UserPageDto;
use App\Gateway\UsersClient;

final readonly class ListUsersAction
{
    public function __construct(private UsersClient $users) {}

    public function execute(UserFilterDto $filter): UserPageDto
    {
        return $this->users->list($filter);
    }
}
