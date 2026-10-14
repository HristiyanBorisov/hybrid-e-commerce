<?php

namespace App\Models\Concerns;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

/** The slug follows the name ("Phones" → "phones") and stays unique ("phones-2"). */
trait HasSlugFromName
{
    public static function bootHasSlugFromName(): void
    {
        static::saving(function (Model $model): void {
            if ($model->isDirty('name') || blank($model->slug)) {
                $model->slug = static::uniqueSlug($model->name, $model->getKey());
            }
        });
    }

    private static function uniqueSlug(string $name, ?string $ignoreId): string
    {
        $base = Str::slug($name) ?: 'item';
        $slug = $base;

        for ($suffix = 2; static::slugIsTaken($slug, $ignoreId); $suffix++) {
            $slug = "{$base}-{$suffix}";
        }

        return $slug;
    }

    private static function slugIsTaken(string $slug, ?string $ignoreId): bool
    {
        // Soft-deleted rows count too: the database's unique index includes them
        return static::query()
            ->withoutGlobalScopes()
            ->where('slug', $slug)
            ->when($ignoreId, fn ($query) => $query->whereKeyNot($ignoreId))
            ->exists();
    }
}
