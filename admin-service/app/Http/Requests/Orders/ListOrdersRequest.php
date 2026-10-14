<?php

namespace App\Http\Requests\Orders;

use App\Dto\Orders\OrderFilterDto;
use App\Enums\OrderStatus;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/** The filters of the order list: ?status=&search=&from=&to=&page= */
final class ListOrdersRequest extends FormRequest
{
    /** @return array<string, array<int, mixed>> */
    public function rules(): array
    {
        return [
            'status' => ['nullable', Rule::enum(OrderStatus::class)],
            'search' => ['nullable', 'string', 'max:100'],
            'from' => ['nullable', 'date_format:Y-m-d'],
            'to' => ['nullable', 'date_format:Y-m-d', 'after_or_equal:from'],
            'page' => ['nullable', 'integer', 'min:1'],
        ];
    }

    public function toDto(): OrderFilterDto
    {
        return new OrderFilterDto(
            status: $this->enum('status', OrderStatus::class),
            search: $this->validated('search'),
            from: $this->date('from', 'Y-m-d')?->toImmutable(),
            to: $this->date('to', 'Y-m-d')?->toImmutable(),
        );
    }
}
