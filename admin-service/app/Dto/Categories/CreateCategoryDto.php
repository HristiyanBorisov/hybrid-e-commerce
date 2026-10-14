<?php

namespace App\Dto\Categories;

final readonly class CreateCategoryDto
{
    public function __construct(
        public string $name,
        /** Null makes it a top-level category */
        public ?string $parentId = null,
    ) {}
}
