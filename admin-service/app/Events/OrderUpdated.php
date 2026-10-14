<?php

namespace App\Events;

use App\Models\Order;
use App\Support\Money;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Contracts\Events\ShouldDispatchAfterCommit;
use Illuminate\Foundation\Events\Dispatchable;

/**
 * A new order arrived, or an order changed — sent live to every open admin page (Laravel Echo), which shows it as
 * a notification. Sent by the queue worker through Reverb, and only once the change is committed.
 */
final class OrderUpdated implements ShouldBroadcast, ShouldDispatchAfterCommit
{
    use Dispatchable;

    public function __construct(
        public readonly string $orderId,
        /** true when the order is new to the admin panel */
        public readonly bool $isNew,
    ) {}

    /** @return list<PrivateChannel> */
    public function broadcastOn(): array
    {
        return [new PrivateChannel('admin')];
    }

    public function broadcastAs(): string
    {
        return 'order.updated';
    }

    /**
     * The order as it is when the notification is sent.
     *
     * @return array<string, mixed>
     */
    public function broadcastWith(): array
    {
        $order = Order::query()->findOrFail($this->orderId);

        return [
            'id' => $order->id,
            'isNew' => $this->isNew,
            'customerName' => $order->customer_name,
            'status' => $order->status->label(),
            'total' => Money::format($order->total_cents),
            'url' => route('admin.orders.show', $order->id),
        ];
    }
}
