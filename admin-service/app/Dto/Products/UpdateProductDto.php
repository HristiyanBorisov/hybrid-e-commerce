<?php

namespace App\Dto\Products;

use Illuminate\Http\UploadedFile;

final readonly class UpdateProductDto
{
    public function __construct(
        public string $categoryId,
        public string $sku,
        public string $name,
        public int $priceCents,
        public ?string $description = null,
        /** Null keeps the current image */
        public ?UploadedFile $image = null,
    ) {}
}
