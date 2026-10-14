<?php

namespace App\Http\Controllers\Admin;

use App\Actions\Categories\CreateCategoryAction;
use App\Actions\Categories\DeleteCategoryAction;
use App\Actions\Categories\ListCategoryTreeAction;
use App\Actions\Categories\UpdateCategoryAction;
use App\Dto\Categories\CategoryTreeItemDto;
use App\Http\Controllers\Controller;
use App\Http\Requests\Categories\StoreCategoryRequest;
use App\Http\Requests\Categories\UpdateCategoryRequest;
use App\Models\Category;
use Illuminate\Http\RedirectResponse;
use Illuminate\View\View;

final class CategoryController extends Controller
{
    public function index(ListCategoryTreeAction $listTree): View
    {
        return view('admin.categories.index', ['categories' => $listTree->execute()]);
    }

    public function create(ListCategoryTreeAction $listTree): View
    {
        return view('admin.categories.create', ['parents' => $listTree->execute()]);
    }

    public function store(StoreCategoryRequest $request, CreateCategoryAction $createCategory): RedirectResponse
    {
        $category = $createCategory->execute($request->toDto());

        return redirect()
            ->route('admin.categories.index')
            ->with('status', __('Category ":name" created.', ['name' => $category->name]));
    }

    public function edit(Category $category, ListCategoryTreeAction $listTree): View
    {
        // A category can't become its own parent, nor the child of one of its subcategories
        $blocked = [$category->id, ...$category->descendantIds()];

        return view('admin.categories.edit', [
            'category' => $category,
            'parents' => array_values(array_filter(
                $listTree->execute(),
                fn (CategoryTreeItemDto $item) => ! in_array($item->id, $blocked, true),
            )),
        ]);
    }

    public function update(UpdateCategoryRequest $request, Category $category, UpdateCategoryAction $updateCategory): RedirectResponse
    {
        $updateCategory->execute($category, $request->toDto());

        return redirect()
            ->route('admin.categories.index')
            ->with('status', __('Category ":name" updated.', ['name' => $category->name]));
    }

    public function destroy(Category $category, DeleteCategoryAction $deleteCategory): RedirectResponse
    {
        $deleteCategory->execute($category);

        return redirect()
            ->route('admin.categories.index')
            ->with('status', __('Category ":name" deleted.', ['name' => $category->name]));
    }
}
