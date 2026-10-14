<?php

namespace App\Actions\Categories;

use App\Exceptions\Catalog\CategoryInUseException;
use App\Models\Category;

/** Only empty categories can be deleted (the database's RESTRICT foreign keys enforce it too). */
final class DeleteCategoryAction
{
    /** @throws CategoryInUseException */
    public function execute(Category $category): void
    {
        if ($category->isInUse()) {
            throw new CategoryInUseException($category->name);
        }

        $category->delete();
    }
}
