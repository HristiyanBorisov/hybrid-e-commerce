<?php

namespace App\Actions\Products;

use App\Dto\Products\ProductFilterDto;
use App\Enums\TrashedFilter;
use App\Models\Category;
use App\Models\Product;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Builder;

/** One page of products, newest first. Filtering by a category includes its subcategories. */
final class ListProductsAction
{
    /** @return LengthAwarePaginator<int, Product> */
    public function execute(ProductFilterDto $filter): LengthAwarePaginator
    {
        return Product::query()
            ->with(['category', 'stockLevel'])
            ->when($filter->trashed === TrashedFilter::Only, fn (Builder $query) => $query->onlyTrashed())
            ->when($filter->search, fn (Builder $query, string $search) => $query->where(
                fn (Builder $query) => $query->whereLike('name', "%{$search}%")->orWhereLike('sku', "%{$search}%"),
            ))
            ->when($filter->categoryId, fn (Builder $query, string $categoryId) => $query->whereIn(
                'category_id',
                [$categoryId, ...Category::findOrFail($categoryId)->descendantIds()],
            ))
            // UUIDv7 ids grow over time, so this is "newest first" with a stable order between pages
            ->orderByDesc('id')
            ->paginate(ProductFilterDto::PER_PAGE)
            ->withQueryString();
    }
}
