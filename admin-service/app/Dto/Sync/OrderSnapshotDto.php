<?php

namespace App\Dto\Sync;

use App\Enums\OrderStatus;

/** An order as the API gateway has it now — the whole record, with its items and version. */
final readonly class OrderSnapshotDto
{
    /** @param list<OrderItemSnapshotDto> $items */
    public function __construct(
        public string $id,
        public string $customerId,
        public string $customerName,
        public string $customerEmail,
        public OrderStatus $status,
        public int $totalCents,
        public int $version,
        /** ISO 8601 */
        public string $createdAt,
        /** ISO 8601 */
        public string $updatedAt,
        public array $items,
    ) {}
}
