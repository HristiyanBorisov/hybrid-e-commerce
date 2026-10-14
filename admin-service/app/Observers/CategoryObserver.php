<?php

namespace App\Observers;

use App\Jobs\SyncCategoryToGateway;
use App\Models\Category;
use Illuminate\Contracts\Events\ShouldHandleEventsAfterCommit;

/**
 * The API gateway keeps a copy of the categories: every change is sent there by a queued job.
 * After commit: nothing is sent for changes that were rolled back.
 */
final class CategoryObserver implements ShouldHandleEventsAfterCommit
{
    public function saved(Category $category): void
    {
        SyncCategoryToGateway::dispatch($category->id);
    }

    public function deleted(Category $category): void
    {
        SyncCategoryToGateway::dispatch($category->id);
    }
}
