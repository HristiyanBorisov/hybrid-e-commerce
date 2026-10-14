<?php

namespace App\Actions\Sync;

use App\Gateway\CatalogSyncClient;
use App\Http\Resources\ProductResource;
use App\Models\Product;

/**
 * Sends a product to the API gateway as it is *now* (also when soft-deleted: deletedAt tells the gateway
 * to hide it). Reading the current state means an old, retried job can never send outdated data.
 */
final readonly class SyncProductAction
{
    public function __construct(private CatalogSyncClient $gateway) {}

    public function execute(string $productId): void
    {
        $product = Product::withTrashed()->find($productId);

        if ($product === null) {
            $this->gateway->deleteProduct($productId);

            return;
        }

        $this->gateway->putProduct(ProductResource::make($product)->resolve());
    }
}
