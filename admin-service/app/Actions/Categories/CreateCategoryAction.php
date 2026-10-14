<?php

namespace App\Actions\Categories;

use App\Dto\Categories\CreateCategoryDto;
use App\Models\Category;

/** The slug is generated from the name; the API gateway gets a copy (CategoryObserver). */
final class CreateCategoryAction
{
    public function execute(CreateCategoryDto $data): Category
    {
        return Category::create([
            'name' => $data->name,
            'parent_id' => $data->parentId,
        ]);
    }
}
