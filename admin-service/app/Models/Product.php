<?php

namespace App\Models;

use App\Models\Concerns\HasSlugFromName;
use App\Models\Concerns\HasSyncVersion;
use App\Observers\ProductObserver;
use Database\Factories\ProductFactory;
use Illuminate\Database\Eloquent\Attributes\ObservedBy;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Facades\Storage;

/**
 * A product of the catalog. Soft-deleted only (never permanently), so ordered products never disappear.
 *
 * @property string $id UUIDv7
 * @property string $category_id
 * @property string $sku
 * @property string $name
 * @property string $slug
 * @property string|null $description
 * @property int $price_cents
 * @property string|null $image_path original upload on the "public" disk
 * @property string|null $thumbnail_path made by the ProcessProductImage job
 * @property int $version
 */
#[ObservedBy(ProductObserver::class)]
class Product extends Model
{
    /** @use HasFactory<ProductFactory> */
    use HasFactory, HasSlugFromName, HasSyncVersion, HasUuids, SoftDeletes;

    protected $fillable = ['category_id', 'sku', 'name', 'description', 'price_cents', 'image_path', 'thumbnail_path'];

    protected function casts(): array
    {
        return [
            'price_cents' => 'integer',
            'version' => 'integer',
        ];
    }

    /** @return BelongsTo<Category, $this> */
    public function category(): BelongsTo
    {
        return $this->belongsTo(Category::class);
    }

    /**
     * The copy of its stock (the API gateway owns stock). None until the product is first stocked.
     *
     * @return HasOne<StockLevel, $this>
     */
    public function stockLevel(): HasOne
    {
        return $this->hasOne(StockLevel::class);
    }

    /** Units in stock — 0 before the product is first stocked */
    public function stock(): int
    {
        return $this->stockLevel?->quantity ?? 0;
    }

    public function imageUrl(): ?string
    {
        return $this->image_path ? Storage::disk('public')->url($this->image_path) : null;
    }

    public function thumbnailUrl(): ?string
    {
        return $this->thumbnail_path ? Storage::disk('public')->url($this->thumbnail_path) : null;
    }
}
