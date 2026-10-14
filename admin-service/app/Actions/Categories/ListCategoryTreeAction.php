<?php

namespace App\Actions\Categories;

use App\Dto\Categories\CategoryTreeItemDto;
use App\Models\Category;
use Illuminate\Support\Collection;

/** All categories as a tree, flattened for display: each parent followed by its subcategories, A–Z. */
final class ListCategoryTreeAction
{
    /** @return list<CategoryTreeItemDto> */
    public function execute(): array
    {
        $categories = Category::query()
            ->withCount(['children', 'products' => fn ($products) => $products->withTrashed()])
            ->orderBy('name')
            ->get();

        return $this->flatten($categories->groupBy('parent_id'), parentId: '', depth: 0);
    }

    /**
     * @param  Collection<string, Collection<int, Category>>  $byParent  top-level categories are under ''
     * @return list<CategoryTreeItemDto>
     */
    private function flatten(Collection $byParent, string $parentId, int $depth): array
    {
        $items = [];

        foreach ($byParent->get($parentId, []) as $category) {
            $items[] = new CategoryTreeItemDto(
                id: $category->id,
                name: $category->name,
                slug: $category->slug,
                depth: $depth,
                productCount: $category->products_count,
                childCount: $category->children_count,
            );

            array_push($items, ...$this->flatten($byParent, $category->id, $depth + 1));
        }

        return $items;
    }
}
