<?php

namespace App\Dto\Categories;

/** One category in the tree, in display order: depth 0 is top level, 1 its subcategories, … */
final readonly class CategoryTreeItemDto
{
    public function __construct(
        public string $id,
        public string $name,
        public string $slug,
        public int $depth,
        public int $productCount,
        public int $childCount,
    ) {}

    /** "Phones" at depth 1 → "— Phones", for select boxes */
    public function indentedName(): string
    {
        return str_repeat('— ', $this->depth).$this->name;
    }

    public function isInUse(): bool
    {
        return $this->productCount > 0 || $this->childCount > 0;
    }
}
