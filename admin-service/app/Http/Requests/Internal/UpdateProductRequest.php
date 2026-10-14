<?php

namespace App\Http\Requests\Internal;

use App\Dto\Products\UpdateProductDto;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/** PUT /internal/v1/products/{id} — the API gateway forwards a product update (the whole product, no image). */
final class UpdateProductRequest extends FormRequest
{
    /** @return array<string, array<int, mixed>> */
    public function rules(): array
    {
        return [
            'categoryId' => ['required', 'uuid', Rule::exists('categories', 'id')],
            'sku' => ['required', 'string', 'max:64', Rule::unique('products', 'sku')->ignore($this->route('product'))],
            'name' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:5000'],
            'priceCents' => ['required', 'integer', 'min:0', 'max:999999900'],
        ];
    }

    public function toDto(): UpdateProductDto
    {
        return new UpdateProductDto(
            categoryId: $this->validated('categoryId'),
            sku: $this->validated('sku'),
            name: $this->validated('name'),
            priceCents: (int) $this->validated('priceCents'),
            description: $this->validated('description'),
        );
    }
}
