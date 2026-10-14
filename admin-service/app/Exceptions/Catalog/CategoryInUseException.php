<?php

namespace App\Exceptions\Catalog;

use Illuminate\Contracts\Debug\ShouldntReport;
use Illuminate\Http\RedirectResponse;
use RuntimeException;

/** A category with subcategories or products (also soft-deleted ones) can't be deleted. */
final class CategoryInUseException extends RuntimeException implements ShouldntReport
{
    public function __construct(string $categoryName)
    {
        parent::__construct(__('":name" still has subcategories or products — move or delete them first.', ['name' => $categoryName]));
    }

    public function render(): RedirectResponse
    {
        return back()->with('error', $this->getMessage());
    }
}
