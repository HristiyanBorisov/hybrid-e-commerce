<?php

namespace App\Dto\Products;

use App\Support\Money;

/** One validated row of a product CSV: sku,name,category_slug,price,description */
final readonly class ProductCsvRowDto
{
    public const COLUMNS = ['sku', 'name', 'category_slug', 'price', 'description'];

    public function __construct(
        public string $sku,
        public string $name,
        public string $categorySlug,
        public int $priceCents,
        public ?string $description,
    ) {}

    /** @param array{sku: string, name: string, category_slug: string, price: string, description?: string|null} $row */
    public static function fromValidatedRow(array $row): self
    {
        return new self(
            sku: $row['sku'],
            name: $row['name'],
            categorySlug: $row['category_slug'],
            priceCents: Money::toCents($row['price']),
            description: ($row['description'] ?? '') !== '' ? $row['description'] : null,
        );
    }
}
