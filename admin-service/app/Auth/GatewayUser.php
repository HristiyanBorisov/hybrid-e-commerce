<?php

namespace App\Auth;

use App\Enums\UserRole;
use Illuminate\Contracts\Auth\Authenticatable;

/**
 * The logged-in user, built from the login token — there's no users table in this app.
 * Passwords and "remember me" tokens are handled by the API gateway, so those methods are empty.
 */
final readonly class GatewayUser implements Authenticatable
{
    public function __construct(
        public string $id,
        public string $name,
        public string $email,
        public UserRole $role,
    ) {}

    public function isAdmin(): bool
    {
        return $this->role === UserRole::Admin;
    }

    public function getAuthIdentifierName(): string
    {
        return 'id';
    }

    public function getAuthIdentifier(): string
    {
        return $this->id;
    }

    public function getAuthPasswordName(): string
    {
        return 'password';
    }

    public function getAuthPassword(): string
    {
        return '';
    }

    public function getRememberToken(): ?string
    {
        return null;
    }

    public function setRememberToken($value): void {}

    public function getRememberTokenName(): string
    {
        return '';
    }
}
