<?php

namespace App\Dto\Orders;

use App\Enums\OrderStatus;

/** An order's status as the API gateway answered a status change — saved into the copy right away. */
final readonly class OrderStatusDto
{
    public function __construct(
        public string $id,
        public OrderStatus $status,
        public int $version,
        /** ISO 8601 */
        public string $updatedAt,
    ) {}

    /** @param array{id: string, status: string, version: int, updatedAt: string} $data the gateway's order */
    public static function fromArray(array $data): self
    {
        return new self(
            id: $data['id'],
            status: OrderStatus::from($data['status']),
            version: $data['version'],
            updatedAt: $data['updatedAt'],
        );
    }
}
