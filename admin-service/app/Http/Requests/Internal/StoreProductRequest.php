<?php

namespace App\Http\Requests\Internal;

use App\Dto\Products\CreateProductDto;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * POST /internal/v1/products — the API gateway forwards a product it was asked to create.
 * JSON with camelCase fields and the price in cents, like the gateway's own API.
 */
final class StoreProductRequest extends FormRequest
{
    /** @return array<string, array<int, mixed>> */
    public function rules(): array
    {
        return [
            'categoryId' => ['required', 'uuid', Rule::exists('categories', 'id')],
            'sku' => ['required', 'string', 'max:64', Rule::unique('products', 'sku')],
            'name' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:5000'],
            'priceCents' => ['required', 'integer', 'min:0', 'max:999999900'],
        ];
    }

    public function toDto(): CreateProductDto
    {
        return new CreateProductDto(
            categoryId: $this->validated('categoryId'),
            sku: $this->validated('sku'),
            name: $this->validated('name'),
            priceCents: (int) $this->validated('priceCents'),
            description: $this->validated('description'),
        );
    }
}
