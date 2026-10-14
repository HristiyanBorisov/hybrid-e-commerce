<?php

namespace App\Actions\Sync;

use App\Gateway\CatalogSyncClient;
use App\Http\Resources\CategoryResource;
use App\Models\Category;

/**
 * Sends a category to the API gateway as it is *now* — or tells the gateway it's gone.
 * Reading the current state (instead of what it was when the job was queued) means an old,
 * retried job can never send outdated data.
 */
final readonly class SyncCategoryAction
{
    public function __construct(private CatalogSyncClient $gateway) {}

    public function execute(string $categoryId): void
    {
        $category = Category::find($categoryId);

        if ($category === null) {
            $this->gateway->deleteCategory($categoryId);

            return;
        }

        $this->gateway->putCategory(CategoryResource::make($category)->resolve());
    }
}
