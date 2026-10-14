<?php

namespace App\Actions\Products;

use App\Dto\Products\CreateProductDto;
use App\Jobs\ProcessProductImage;
use App\Models\Product;
use App\Support\ProductImageStorage;

/** The thumbnail is made by a queued job, so the request returns right away. */
final readonly class CreateProductAction
{
    public function __construct(private ProductImageStorage $images) {}

    public function execute(CreateProductDto $data): Product
    {
        $product = Product::create([
            'category_id' => $data->categoryId,
            'sku' => $data->sku,
            'name' => $data->name,
            'description' => $data->description,
            'price_cents' => $data->priceCents,
            'image_path' => $data->image ? $this->images->store($data->image) : null,
        ]);

        if ($product->image_path) {
            ProcessProductImage::dispatch($product->id);
        }

        return $product;
    }
}
