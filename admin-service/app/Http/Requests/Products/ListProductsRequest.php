<?php

namespace App\Http\Requests\Products;

use App\Dto\Products\ProductFilterDto;
use App\Enums\TrashedFilter;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/** The filters of the product list: ?search=&category_id=&trashed=&page= */
final class ListProductsRequest extends FormRequest
{
    /** @return array<string, array<int, mixed>> */
    public function rules(): array
    {
        return [
            'search' => ['nullable', 'string', 'max:100'],
            'category_id' => ['nullable', 'uuid', Rule::exists('categories', 'id')],
            'trashed' => ['nullable', Rule::enum(TrashedFilter::class)],
            'page' => ['nullable', 'integer', 'min:1'],
        ];
    }

    public function toDto(): ProductFilterDto
    {
        return new ProductFilterDto(
            search: $this->validated('search'),
            categoryId: $this->validated('category_id'),
            trashed: $this->enum('trashed', TrashedFilter::class) ?? TrashedFilter::Without,
        );
    }
}
