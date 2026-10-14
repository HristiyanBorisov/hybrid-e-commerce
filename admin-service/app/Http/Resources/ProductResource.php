<?php

namespace App\Http\Resources;

use App\Models\Product;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * A product as the admin service describes it to other services: the answer of the internal product API
 * and the sync message the API gateway receives. One format for both.
 *
 * @mixin Product
 */
final class ProductResource extends JsonResource
{
    /** The product itself, not wrapped in {"data": …} */
    public static $wrap = null;

    /** @return array<string, mixed> */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'categoryId' => $this->category_id,
            'sku' => $this->sku,
            'name' => $this->name,
            'slug' => $this->slug,
            'description' => $this->description,
            'priceCents' => $this->price_cents,
            'imageUrl' => $this->imageUrl(),
            'thumbnailUrl' => $this->thumbnailUrl(),
            'version' => $this->version,
            'createdAt' => $this->created_at?->toIso8601String(),
            'updatedAt' => $this->updated_at?->toIso8601String(),
            // Set when the product is soft-deleted: the gateway hides it, but keeps it for order history
            'deletedAt' => $this->deleted_at?->toIso8601String(),
        ];
    }
}
