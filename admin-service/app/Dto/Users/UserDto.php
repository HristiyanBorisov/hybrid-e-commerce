<?php

namespace App\Dto\Users;

use App\Enums\UserRole;
use Carbon\CarbonImmutable;

/** A user as the API gateway returns it. */
final readonly class UserDto
{
    public function __construct(
        public string $id,
        public string $name,
        public string $email,
        public UserRole $role,
        public CarbonImmutable $createdAt,
    ) {}

    /** @param array{id: string, name: string, email: string, role: string, createdAt: string} $data */
    public static function fromArray(array $data): self
    {
        return new self(
            id: $data['id'],
            name: $data['name'],
            email: $data['email'],
            role: UserRole::from($data['role']),
            createdAt: CarbonImmutable::parse($data['createdAt']),
        );
    }
}
