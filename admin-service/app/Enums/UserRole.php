<?php

namespace App\Enums;

/** Mirrors the API gateway's PostgreSQL enum type `user_role`. */
enum UserRole: string
{
    case Customer = 'customer';
    case Admin = 'admin';

    public function label(): string
    {
        return ucfirst($this->value);
    }
}
