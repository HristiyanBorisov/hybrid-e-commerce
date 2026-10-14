<?php

namespace App\Actions\Categories;

use App\Dto\Categories\UpdateCategoryDto;
use App\Models\Category;

/** Renames or moves a category. UpdateCategoryRequest already rejected moving it below itself. */
final class UpdateCategoryAction
{
    public function execute(Category $category, UpdateCategoryDto $data): Category
    {
        $category->update([
            'name' => $data->name,
            'parent_id' => $data->parentId,
        ]);

        return $category;
    }
}
