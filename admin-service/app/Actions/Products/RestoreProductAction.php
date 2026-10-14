<?php

namespace App\Actions\Products;

use App\Models\Product;

/** Brings a soft-deleted product back from the trash. */
final class RestoreProductAction
{
    public function execute(Product $product): void
    {
        $product->restore();
    }
}
