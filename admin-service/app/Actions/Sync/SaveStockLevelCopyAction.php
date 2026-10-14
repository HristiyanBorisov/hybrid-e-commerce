<?php

namespace App\Actions\Sync;

use App\Dto\Sync\StockLevelSnapshotDto;
use Illuminate\Support\Facades\DB;

/**
 * Saves a product's stock from the API gateway into this service's copy — only when its version is newer than
 * the copy's, decided in one atomic statement.
 */
final readonly class SaveStockLevelCopyAction
{
    public function execute(StockLevelSnapshotDto $stockLevel): void
    {
        DB::statement(<<<'SQL'
            INSERT INTO stock_levels (product_id, quantity, version)
            VALUES (?, ?, ?)
            ON CONFLICT (product_id) DO UPDATE SET
                quantity = excluded.quantity,
                version = excluded.version
            WHERE stock_levels.version < excluded.version
            SQL, [$stockLevel->productId, $stockLevel->quantity, $stockLevel->version]);
    }
}
