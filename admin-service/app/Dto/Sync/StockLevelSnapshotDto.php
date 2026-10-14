<?php

namespace App\Dto\Sync;

/**
 * A product's stock as the API gateway has it now: a sync message, or the gateway's answer to a stock
 * adjustment (both have the same fields).
 */
final readonly class StockLevelSnapshotDto
{
    public function __construct(
        public string $productId,
        public int $quantity,
        public int $version,
    ) {}

    /** @param array{productId: string, quantity: int, version: int} $data */
    public static function fromArray(array $data): self
    {
        return new self(
            productId: $data['productId'],
            quantity: $data['quantity'],
            version: $data['version'],
        );
    }
}
