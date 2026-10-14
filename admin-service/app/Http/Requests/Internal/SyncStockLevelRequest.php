<?php

namespace App\Http\Requests\Internal;

use App\Dto\Sync\StockLevelSnapshotDto;
use Illuminate\Foundation\Http\FormRequest;

/** PUT /internal/v1/sync/stock-levels/{productId} — the API gateway sends a product's stock as it is now. */
final class SyncStockLevelRequest extends FormRequest
{
    /** @return array<string, array<int, mixed>> */
    public function rules(): array
    {
        return [
            'quantity' => ['required', 'integer', 'min:0'],
            'version' => ['required', 'integer', 'min:1'],
        ];
    }

    public function toDto(): StockLevelSnapshotDto
    {
        return new StockLevelSnapshotDto(
            productId: $this->route('productId'),
            quantity: (int) $this->validated('quantity'),
            version: (int) $this->validated('version'),
        );
    }
}
