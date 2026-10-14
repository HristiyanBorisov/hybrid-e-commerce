<?php

namespace App\Http\Requests\Internal;

use App\Dto\Sync\OrderItemSnapshotDto;
use App\Dto\Sync\OrderSnapshotDto;
use App\Enums\OrderStatus;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/** PUT /internal/v1/sync/orders/{orderId} — the API gateway sends an order as it is now. The id is the URL's. */
final class SyncOrderRequest extends FormRequest
{
    /** @return array<string, array<int, mixed>> */
    public function rules(): array
    {
        return [
            'customerId' => ['required', 'uuid'],
            'customerName' => ['required', 'string', 'max:255'],
            'customerEmail' => ['required', 'string', 'max:255'],
            'status' => ['required', Rule::enum(OrderStatus::class)],
            'totalCents' => ['required', 'integer', 'min:0'],
            'version' => ['required', 'integer', 'min:1'],
            'createdAt' => ['required', 'date'],
            'updatedAt' => ['required', 'date'],
            'items' => ['required', 'array', 'min:1'],
            'items.*.id' => ['required', 'uuid'],
            'items.*.productId' => ['required', 'uuid'],
            'items.*.productName' => ['required', 'string', 'max:255'],
            'items.*.unitPriceCents' => ['required', 'integer', 'min:0'],
            'items.*.quantity' => ['required', 'integer', 'min:1'],
        ];
    }

    public function toDto(): OrderSnapshotDto
    {
        return new OrderSnapshotDto(
            id: $this->route('orderId'),
            customerId: $this->validated('customerId'),
            customerName: $this->validated('customerName'),
            customerEmail: $this->validated('customerEmail'),
            status: $this->enum('status', OrderStatus::class),
            totalCents: (int) $this->validated('totalCents'),
            version: (int) $this->validated('version'),
            createdAt: $this->validated('createdAt'),
            updatedAt: $this->validated('updatedAt'),
            items: array_map(fn (array $item) => new OrderItemSnapshotDto(
                id: $item['id'],
                productId: $item['productId'],
                productName: $item['productName'],
                unitPriceCents: (int) $item['unitPriceCents'],
                quantity: (int) $item['quantity'],
            ), $this->validated('items')),
        );
    }
}
