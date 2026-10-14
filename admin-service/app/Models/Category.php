<?php

namespace App\Models;

use App\Models\Concerns\HasSlugFromName;
use App\Models\Concerns\HasSyncVersion;
use App\Observers\CategoryObserver;
use Database\Factories\CategoryFactory;
use Illuminate\Database\Eloquent\Attributes\ObservedBy;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Facades\DB;

/**
 * A product category. Categories nest: parent_id points to the parent, NULL means top level.
 *
 * @property string $id UUIDv7
 * @property string|null $parent_id
 * @property string $name
 * @property string $slug
 * @property int $version
 */
#[ObservedBy(CategoryObserver::class)]
class Category extends Model
{
    /** @use HasFactory<CategoryFactory> */
    use HasFactory, HasSlugFromName, HasSyncVersion, HasUuids;

    protected $fillable = ['parent_id', 'name'];

    /** @return BelongsTo<Category, $this> */
    public function parent(): BelongsTo
    {
        return $this->belongsTo(self::class, 'parent_id');
    }

    /** @return HasMany<Category, $this> */
    public function children(): HasMany
    {
        return $this->hasMany(self::class, 'parent_id');
    }

    /** @return HasMany<Product, $this> */
    public function products(): HasMany
    {
        return $this->hasMany(Product::class);
    }

    /**
     * Ids of all subcategories at any depth, read with one recursive query.
     *
     * @return list<string>
     */
    public function descendantIds(): array
    {
        $rows = DB::select(<<<'SQL'
            WITH RECURSIVE descendants AS (
                SELECT id FROM categories WHERE parent_id = ?
                UNION ALL
                SELECT categories.id FROM categories JOIN descendants ON categories.parent_id = descendants.id
            )
            SELECT id FROM descendants
            SQL, [$this->id]);

        return array_column($rows, 'id');
    }

    /** A category with subcategories or products (also soft-deleted ones) can't be deleted. */
    public function isInUse(): bool
    {
        return $this->children()->exists() || $this->products()->withTrashed()->exists();
    }
}
