<?php

namespace App\Actions\Products;

use App\Models\Product;

/** Soft delete: the product moves to the trash and can be restored. It's never deleted permanently. */
final class DeleteProductAction
{
    public function execute(Product $product): void
    {
        $product->delete();
    }
}
