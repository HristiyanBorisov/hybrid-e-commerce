<?php

namespace App\Http\Requests\Products;

use App\Dto\Products\UpdateProductDto;
use App\Support\Money;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/** The "edit product" form. No image keeps the current one. */
final class UpdateProductRequest extends FormRequest
{
    /** @return array<string, array<int, mixed>> */
    public function rules(): array
    {
        return [
            'category_id' => ['required', 'uuid', Rule::exists('categories', 'id')],
            'sku' => ['required', 'string', 'max:64', Rule::unique('products', 'sku')->ignore($this->route('product'))],
            'name' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:5000'],
            'price' => ['required', 'decimal:0,2', 'min:0', 'max:9999999'],
            'image' => ['nullable', 'image', 'mimes:jpg,jpeg,png,webp', 'max:5120'],
        ];
    }

    public function toDto(): UpdateProductDto
    {
        return new UpdateProductDto(
            categoryId: $this->validated('category_id'),
            sku: $this->validated('sku'),
            name: $this->validated('name'),
            priceCents: Money::toCents($this->validated('price')),
            description: $this->validated('description'),
            image: $this->file('image'),
        );
    }
}
