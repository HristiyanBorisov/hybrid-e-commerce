<?php

namespace App\Dto\Products;

use Illuminate\Http\UploadedFile;

final readonly class CreateProductDto
{
    public function __construct(
        public string $categoryId,
        public string $sku,
        public string $name,
        public int $priceCents,
        public ?string $description = null,
        public ?UploadedFile $image = null,
    ) {}
}
