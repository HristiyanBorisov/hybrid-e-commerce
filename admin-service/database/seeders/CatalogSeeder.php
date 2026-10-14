<?php

namespace Database\Seeders;

use App\Models\Category;
use App\Models\Product;
use Illuminate\Database\Seeder;

/**
 * A small demo catalog: top-level categories, their subcategories and a few products each.
 * Running it again changes nothing (categories are matched by name, products by SKU).
 */
final class CatalogSeeder extends Seeder
{
    /** Top-level category => subcategory => [sku, name, price in cents] */
    private const CATALOG = [
        'Electronics' => [
            'Phones' => [
                ['PHN-001', 'Pixel Pro 9', 79_900],
                ['PHN-002', 'Galaxy Ultra S', 99_900],
                ['PHN-003', 'Budget Phone Lite', 19_900],
            ],
            'Laptops' => [
                ['LAP-001', 'Ultrabook 14', 129_900],
                ['LAP-002', 'Gaming Laptop 16', 189_900],
            ],
            'Accessories' => [
                ['ACC-001', 'USB-C Charger 65W', 3_999],
                ['ACC-002', 'Wireless Earbuds', 8_999],
            ],
        ],
        'Books' => [
            'Fiction' => [
                ['BOK-001', 'The Long Voyage', 1_499],
                ['BOK-002', 'Midnight Garden', 1_299],
            ],
            'Non-fiction' => [
                ['BOK-003', 'Clean Architecture in Practice', 3_499],
            ],
        ],
        'Home & Kitchen' => [
            'Cookware' => [
                ['HOM-001', 'Cast Iron Skillet', 4_499],
                ['HOM-002', 'Chef Knife 20 cm', 5_999],
            ],
        ],
    ];

    public function run(): void
    {
        foreach (self::CATALOG as $topLevelName => $subcategories) {
            $topLevel = Category::firstOrCreate(['name' => $topLevelName, 'parent_id' => null]);

            foreach ($subcategories as $subcategoryName => $products) {
                $subcategory = Category::firstOrCreate(['name' => $subcategoryName, 'parent_id' => $topLevel->id]);

                foreach ($products as [$sku, $name, $priceCents]) {
                    // Also finds products an admin moved to the trash (SKUs are unique across the trash)
                    Product::withTrashed()->firstOrCreate(['sku' => $sku], [
                        'category_id' => $subcategory->id,
                        'name' => $name,
                        'price_cents' => $priceCents,
                        'description' => "Demo product: {$name}.",
                    ]);
                }
            }
        }
    }
}
