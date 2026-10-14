<?php

namespace App\Actions\Products;

use App\Dto\Products\ProductCsvRowDto;
use App\Models\Product;
use App\Support\Money;
use Generator;

/**
 * The CSV rows of all active products, in the same columns the import reads — an export can be imported again.
 * A generator with chunked reads: memory use stays flat however big the catalog is.
 */
final class ExportProductsAction
{
    /** @return Generator<int, list<string>> the header row, then one row per product */
    public function execute(): Generator
    {
        yield ProductCsvRowDto::COLUMNS;

        foreach (Product::query()->with('category')->orderBy('sku')->lazy(500) as $product) {
            yield [
                $product->sku,
                $product->name,
                $product->category->slug,
                Money::toDecimal($product->price_cents),
                (string) $product->description,
            ];
        }
    }
}
