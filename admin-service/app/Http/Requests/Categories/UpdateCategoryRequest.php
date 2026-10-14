<?php

namespace App\Http\Requests\Categories;

use App\Dto\Categories\UpdateCategoryDto;
use App\Models\Category;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/** Renaming or moving a category. It can't move below itself or below one of its own subcategories (a loop). */
final class UpdateCategoryRequest extends FormRequest
{
    /** @return array<string, array<int, mixed>> */
    public function rules(): array
    {
        /** @var Category $category */
        $category = $this->route('category');

        return [
            'name' => ['required', 'string', 'max:255'],
            'parent_id' => [
                'nullable',
                'uuid',
                Rule::exists('categories', 'id'),
                Rule::notIn([$category->id, ...$category->descendantIds()]),
            ],
        ];
    }

    /** @return array<string, string> */
    public function messages(): array
    {
        return ['parent_id.not_in' => __("A category can't be moved below itself or one of its subcategories.")];
    }

    public function toDto(): UpdateCategoryDto
    {
        return new UpdateCategoryDto(
            name: $this->validated('name'),
            parentId: $this->validated('parent_id'),
        );
    }
}
