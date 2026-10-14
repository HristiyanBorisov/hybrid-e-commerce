<?php

namespace App\Actions\Products;

use App\Dto\Products\UpdateProductDto;
use App\Jobs\ProcessProductImage;
use App\Models\Product;
use App\Support\ProductImageStorage;

/** A new image replaces the old one (whose files are deleted) and gets a new thumbnail. */
final readonly class UpdateProductAction
{
    public function __construct(private ProductImageStorage $images) {}

    public function execute(Product $product, UpdateProductDto $data): Product
    {
        $oldFiles = [$product->image_path, $product->thumbnail_path];

        $product->fill([
            'category_id' => $data->categoryId,
            'sku' => $data->sku,
            'name' => $data->name,
            'description' => $data->description,
            'price_cents' => $data->priceCents,
        ]);

        if ($data->image) {
            $product->image_path = $this->images->store($data->image);
            $product->thumbnail_path = null;
        }

        $product->save();

        if ($data->image) {
            $this->images->delete(...$oldFiles);
            ProcessProductImage::dispatch($product->id);
        }

        return $product;
    }
}
