<?php

namespace App\Models\Concerns;

use Illuminate\Database\Eloquent\Model;

/**
 * `version` goes up with every change. Each sync message to the API gateway carries it, and the gateway
 * ignores messages older than the copy it has — so retries and out-of-order messages are harmless.
 */
trait HasSyncVersion
{
    public static function bootHasSyncVersion(): void
    {
        static::updating(function (Model $model): void {
            $model->version++;
        });

        // A soft delete is a plain UPDATE query that skips the "updating" event — count it here
        if (method_exists(static::class, 'softDeleted')) {
            static::softDeleted(function (Model $model): void {
                $model->newQueryWithoutScopes()->whereKey($model->getKey())->increment('version');
                $model->forceFill(['version' => $model->version + 1])->syncOriginalAttribute('version');
            });
        }
    }

    public function initializeHasSyncVersion(): void
    {
        $this->attributes['version'] ??= 1;
    }
}
