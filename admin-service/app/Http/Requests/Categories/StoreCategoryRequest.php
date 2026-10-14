<?php

namespace App\Http\Requests\Categories;

use App\Dto\Categories\CreateCategoryDto;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

final class StoreCategoryRequest extends FormRequest
{
    /** @return array<string, array<int, mixed>> */
    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:255'],
            'parent_id' => ['nullable', 'uuid', Rule::exists('categories', 'id')],
        ];
    }

    public function toDto(): CreateCategoryDto
    {
        return new CreateCategoryDto(
            name: $this->validated('name'),
            parentId: $this->validated('parent_id'),
        );
    }
}
