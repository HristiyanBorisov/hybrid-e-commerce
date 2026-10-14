<?php

namespace App\Actions\Sync;

use App\Dto\Sync\OrderItemSnapshotDto;
use App\Dto\Sync\OrderSnapshotDto;
use App\Events\OrderUpdated;
use App\Models\Order;
use App\Models\OrderItem;
use Illuminate\Support\Facades\DB;

/**
 * Saves an order sent by the API gateway into this service's copy — only when its version is newer than the
 * copy's, decided in one atomic statement. Repeated, retried or out-of-order messages change nothing.
 * The items are replaced together with the order, and the admin panel is notified live.
 */
final readonly class SaveOrderCopyAction
{
    public function execute(OrderSnapshotDto $order): void
    {
        DB::transaction(function () use ($order): void {
            $isNew = ! Order::query()->whereKey($order->id)->exists();

            $saved = DB::affectingStatement(<<<'SQL'
                INSERT INTO orders (id, customer_id, customer_name, customer_email, status, total_cents, version, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT (id) DO UPDATE SET
                    customer_id = excluded.customer_id,
                    customer_name = excluded.customer_name,
                    customer_email = excluded.customer_email,
                    status = excluded.status,
                    total_cents = excluded.total_cents,
                    version = excluded.version,
                    created_at = excluded.created_at,
                    updated_at = excluded.updated_at
                WHERE orders.version < excluded.version
                SQL, [
                $order->id,
                $order->customerId,
                $order->customerName,
                $order->customerEmail,
                $order->status->value,
                $order->totalCents,
                $order->version,
                $order->createdAt,
                $order->updatedAt,
            ]);

            if ($saved === 0) {
                return; // the copy already has this version or a newer one
            }

            OrderItem::query()->where('order_id', $order->id)->delete();
            OrderItem::query()->insert(array_map(fn (OrderItemSnapshotDto $item) => [
                'id' => $item->id,
                'order_id' => $order->id,
                'product_id' => $item->productId,
                'product_name' => $item->productName,
                'unit_price_cents' => $item->unitPriceCents,
                'quantity' => $item->quantity,
            ], $order->items));

            OrderUpdated::dispatch($order->id, $isNew);
        });
    }
}
