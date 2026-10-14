<?php

namespace App\Jobs;

use App\Actions\Products\CreateProductThumbnailAction;
use App\Models\Product;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;

/** Makes the thumbnail of a product's uploaded image, outside the web request. */
final class ProcessProductImage implements ShouldQueue
{
    use Queueable;

    public int $tries = 3;

    public function __construct(public readonly string $productId) {}

    public function handle(CreateProductThumbnailAction $createThumbnail): void
    {
        $product = Product::withTrashed()->find($this->productId);

        if ($product !== null) {
            $createThumbnail->execute($product);
        }
    }
}
