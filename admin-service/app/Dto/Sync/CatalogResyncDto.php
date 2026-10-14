<?php

namespace App\Dto\Sync;

/** How many categories and products were queued to be sent to the API gateway again. */
final readonly class CatalogResyncDto
{
    public function __construct(
        public int $categories,
        public int $products,
    ) {}
}
