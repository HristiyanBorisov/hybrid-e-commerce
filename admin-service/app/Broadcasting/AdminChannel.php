<?php

namespace App\Broadcasting;

use App\Auth\GatewayUser;

/** The private "admin" channel: the admin panel's live notifications. Only admins may listen. */
final class AdminChannel
{
    public function join(GatewayUser $user): bool
    {
        return $user->isAdmin();
    }
}
