<?php

namespace App\Dto\Users;

/** One page of users plus where it sits in the whole list. */
final readonly class UserPageDto
{
    /** @param list<UserDto> $users */
    public function __construct(
        public array $users,
        public int $page,
        public int $limit,
        public int $total,
    ) {}

    /**
     * @param array{
     *     data: list<array{id: string, name: string, email: string, role: string, createdAt: string}>,
     *     meta: array{page: int, limit: int, total: int}
     * } $data the gateway's list response
     */
    public static function fromArray(array $data): self
    {
        return new self(
            users: array_map(UserDto::fromArray(...), $data['data']),
            page: $data['meta']['page'],
            limit: $data['meta']['limit'],
            total: $data['meta']['total'],
        );
    }
}
