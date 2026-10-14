<?php

namespace App\Http\Requests\Products;

use Illuminate\Foundation\Http\FormRequest;

/** POST /admin/products/{product}/stock-adjustments — units to add (positive) or remove (negative). */
final class AdjustStockRequest extends FormRequest
{
    /** @return array<string, array<int, mixed>> */
    public function rules(): array
    {
        return [
            'quantity_change' => ['required', 'integer', 'not_in:0', 'between:-1000000,1000000'],
        ];
    }

    public function quantityChange(): int
    {
        return (int) $this->validated('quantity_change');
    }
}
