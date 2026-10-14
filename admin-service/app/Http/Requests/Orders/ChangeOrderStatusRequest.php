<?php

namespace App\Http\Requests\Orders;

use App\Enums\OrderStatus;
use App\Models\Order;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/** PATCH /admin/orders/{order}/status — only the statuses the order can move to next. */
final class ChangeOrderStatusRequest extends FormRequest
{
    /** @return array<string, array<int, mixed>> */
    public function rules(): array
    {
        /** @var Order $order */
        $order = $this->route('order');

        return [
            'status' => ['required', Rule::enum(OrderStatus::class)->only($order->status->nextStatuses())],
        ];
    }

    public function status(): OrderStatus
    {
        return $this->enum('status', OrderStatus::class);
    }
}
