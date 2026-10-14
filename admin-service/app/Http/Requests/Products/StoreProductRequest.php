<?php

namespace App\Http\Requests\Products;

use App\Dto\Products\CreateProductDto;
use App\Support\Money;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/** The "new product" form. The price is typed as a decimal (19.99) and stored as cents (1999). */
final class StoreProductRequest extends FormRequest
{
    /** @return array<string, array<int, mixed>> */
    public function rules(): array
    {
        return [
            'category_id' => ['required', 'uuid', Rule::exists('categories', 'id')],
            // Unique across the trash too: the database's unique index includes soft-deleted products
            'sku' => ['required', 'string', 'max:64', Rule::unique('products', 'sku')],
            'name' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:5000'],
            'price' => ['required', 'decimal:0,2', 'min:0', 'max:9999999'],
            'image' => ['nullable', 'image', 'mimes:jpg,jpeg,png,webp', 'max:5120'],
        ];
    }

    public function toDto(): CreateProductDto
    {
        return new CreateProductDto(
            categoryId: $this->validated('category_id'),
            sku: $this->validated('sku'),
            name: $this->validated('name'),
            priceCents: Money::toCents($this->validated('price')),
            description: $this->validated('description'),
            image: $this->file('image'),
        );
    }
}
