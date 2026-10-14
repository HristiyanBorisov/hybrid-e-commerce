<?php

namespace App\Dto\Products;

use App\Enums\TrashedFilter;

/** How to filter the product list. */
final readonly class ProductFilterDto
{
    public const PER_PAGE = 20;

    public function __construct(
        /** Part of a name or SKU */
        public ?string $search = null,
        public ?string $categoryId = null,
        public TrashedFilter $trashed = TrashedFilter::Without,
    ) {}
}
