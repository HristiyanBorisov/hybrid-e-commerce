<?php

namespace App\Actions\Products;

use App\Actions\Sync\SaveStockLevelCopyAction;
use App\Dto\Sync\StockLevelSnapshotDto;
use App\Gateway\InventoryClient;
use App\Models\Product;

/**
 * Adds or removes stock through the API gateway (the owner). Its answer goes into the copy at once,
 * so the admin sees the new stock right away.
 */
final readonly class AdjustStockAction
{
    public function __construct(
        private InventoryClient $inventory,
        private SaveStockLevelCopyAction $saveStockLevel,
    ) {}

    public function execute(Product $product, int $quantityChange): StockLevelSnapshotDto
    {
        $stockLevel = $this->inventory->adjust($product->id, $quantityChange);
        $this->saveStockLevel->execute($stockLevel);

        return $stockLevel;
    }
}
