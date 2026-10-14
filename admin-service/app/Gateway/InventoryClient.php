<?php

namespace App\Gateway;

use App\Dto\Sync\StockLevelSnapshotDto;

/** Stock is owned by the API gateway: adjustments go through it (/api/v1/inventory, admins only). */
final readonly class InventoryClient
{
    public function __construct(private GatewayClient $gateway) {}

    /** Stock that would go below zero is a 409, shown to the admin as an error. */
    public function adjust(string $productId, int $quantityChange): StockLevelSnapshotDto
    {
        return StockLevelSnapshotDto::fromArray(
            $this->gateway->post("inventory/{$productId}/adjustments", ['quantityChange' => $quantityChange]),
        );
    }
}
