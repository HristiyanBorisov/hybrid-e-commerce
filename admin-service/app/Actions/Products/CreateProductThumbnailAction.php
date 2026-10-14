<?php

namespace App\Actions\Products;

use App\Models\Product;
use App\Support\ProductImageStorage;

/** Runs in the queue (ProcessProductImage). Saving the thumbnail path syncs the product again. */
final readonly class CreateProductThumbnailAction
{
    public function __construct(private ProductImageStorage $images) {}

    public function execute(Product $product): void
    {
        if ($product->image_path === null) {
            return;
        }

        $product->update(['thumbnail_path' => $this->images->createThumbnail($product->image_path)]);
    }
}
