<?php

namespace App\Actions\Users;

use App\Gateway\UsersClient;

/** Soft delete in the gateway. The gateway refuses when admins try to delete themselves. */
final readonly class DeleteUserAction
{
    public function __construct(private UsersClient $users) {}

    public function execute(string $id): void
    {
        $this->users->delete($id);
    }
}
