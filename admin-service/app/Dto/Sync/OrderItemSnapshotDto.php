<?php

namespace App\Dto\Sync;

/** One line of an order sync message. */
final readonly class OrderItemSnapshotDto
{
    public function __construct(
        public string $id,
        public string $productId,
        public string $productName,
        public int $unitPriceCents,
        public int $quantity,
    ) {}
}
