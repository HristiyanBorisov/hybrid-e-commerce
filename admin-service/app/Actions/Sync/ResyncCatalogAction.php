<?php

namespace App\Actions\Sync;

use App\Dto\Sync\CatalogResyncDto;
use App\Jobs\SyncCategoryToGateway;
use App\Jobs\SyncProductToGateway;
use App\Models\Category;
use App\Models\Product;

/**
 * Sends the whole catalog to the API gateway again — for when its copy has drifted (its database was reset, or
 * sync jobs failed for good). Safe to run any time: the gateway ignores versions it already has.
 *
 * Queued by default. $now sends it right away instead (needed while seeding: the gateway stocks the products
 * it has, so it must have them all first).
 */
final readonly class ResyncCatalogAction
{
    public function execute(bool $now = false): CatalogResyncDto
    {
        $categoryIds = Category::query()->pluck('id');
        $productIds = Product::withTrashed()->pluck('id');

        // Categories first, so they usually arrive before their products (not required: the copy has no foreign keys)
        $categoryIds->each(fn (string $id) => $now
            ? SyncCategoryToGateway::dispatchSync($id)
            : SyncCategoryToGateway::dispatch($id));
        $productIds->each(fn (string $id) => $now
            ? SyncProductToGateway::dispatchSync($id)
            : SyncProductToGateway::dispatch($id));

        return new CatalogResyncDto(categories: $categoryIds->count(), products: $productIds->count());
    }
}
