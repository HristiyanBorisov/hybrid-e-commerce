<?php

namespace App\Http\Resources;

use App\Models\Category;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * A category as the admin service describes it to other services — the sync message the API gateway receives.
 *
 * @mixin Category
 */
final class CategoryResource extends JsonResource
{
    /** The category itself, not wrapped in {"data": …} */
    public static $wrap = null;

    /** @return array<string, mixed> */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'parentId' => $this->parent_id,
            'name' => $this->name,
            'slug' => $this->slug,
            'version' => $this->version,
        ];
    }
}
