<?php

namespace App\Observers;

use App\Jobs\SyncProductToGateway;
use App\Models\Product;
use Illuminate\Contracts\Events\ShouldHandleEventsAfterCommit;

/**
 * The API gateway keeps a copy of the products: every change (also a soft delete or a restore — a restore
 * is a save) is sent there by a queued job. After commit: nothing is sent for changes that were rolled back.
 */
final class ProductObserver implements ShouldHandleEventsAfterCommit
{
    public function saved(Product $product): void
    {
        SyncProductToGateway::dispatch($product->id);
    }

    public function deleted(Product $product): void
    {
        SyncProductToGateway::dispatch($product->id);
    }
}
