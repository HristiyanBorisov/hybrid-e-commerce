<?php

namespace App\Actions\Orders;

use App\Enums\OrderStatus;
use App\Events\OrderUpdated;
use App\Gateway\OrdersClient;
use App\Models\Order;

/**
 * Asks the API gateway (the owner) to move the order to another status. Its answer goes into the copy at once,
 * so the admin sees the new status right away (and the other admins get a live notification); the sync message
 * that follows has the same version and is ignored.
 */
final readonly class ChangeOrderStatusAction
{
    public function __construct(private OrdersClient $orders) {}

    public function execute(Order $order, OrderStatus $status): void
    {
        $changed = $this->orders->changeStatus($order->id, $status);

        $saved = Order::query()
            ->whereKey($changed->id)
            ->where('version', '<', $changed->version)
            ->update([
                'status' => $changed->status,
                'version' => $changed->version,
                'updated_at' => $changed->updatedAt,
            ]);

        if ($saved > 0) {
            OrderUpdated::dispatch($changed->id, false);
        }
    }
}
