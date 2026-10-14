<?php

namespace Tests\Feature\Internal;

use App\Enums\OrderStatus;
use App\Events\OrderUpdated;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\StockLevel;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Event;
use Illuminate\Testing\TestResponse;
use Tests\TestCase;

/** The API gateway sends its orders and stock levels here; this service keeps a copy. */
final class SyncApiTest extends TestCase
{
    use RefreshDatabase;

    private const API_KEY = 'test-internal-api-key';

    private const ORDER_ID = '0199e3a0-0000-7000-8000-000000000001';

    private const PRODUCT_ID = '0199e3a0-0000-7000-8000-0000000000aa';

    protected function setUp(): void
    {
        parent::setUp();

        config(['gateway.api_key' => self::API_KEY]);
    }

    public function test_calls_without_the_api_key_are_rejected(): void
    {
        $this->putJson('/internal/v1/sync/orders/'.self::ORDER_ID, $this->order())->assertUnauthorized();
        $this->putJson('/internal/v1/sync/stock-levels/'.self::PRODUCT_ID, ['quantity' => 1, 'version' => 1])->assertUnauthorized();
    }

    public function test_a_new_order_is_saved_with_its_items(): void
    {
        $this->sync('orders/'.self::ORDER_ID, $this->order())->assertNoContent();

        $order = Order::sole();
        $this->assertSame([self::ORDER_ID, 'Alice', 'alice@example.com', OrderStatus::Paid, 7980, 2], [
            $order->id, $order->customer_name, $order->customer_email, $order->status, $order->total_cents, $order->version,
        ]);
        $this->assertSame('2026-10-12 09:30:00', $order->created_at->toDateTimeString());
        $this->assertSame([['Desk Lamp', 2990, 2], ['Rug', 2000, 1]], $order->items->map(
            fn (OrderItem $item) => [$item->product_name, $item->unit_price_cents, $item->quantity],
        )->all());
    }

    public function test_a_newer_version_replaces_the_order_and_an_older_one_is_ignored(): void
    {
        $this->sync('orders/'.self::ORDER_ID, $this->order());

        $this->sync('orders/'.self::ORDER_ID, $this->order(['status' => 'shipped', 'version' => 3, 'items' => [$this->item('Desk Lamp', 2990, 1)]]))
            ->assertNoContent();
        $this->sync('orders/'.self::ORDER_ID, $this->order(['status' => 'cancelled', 'version' => 1]))->assertNoContent(); // a late retry

        $order = Order::sole();
        $this->assertSame([OrderStatus::Shipped, 3, 1], [$order->status, $order->version, $order->items()->count()]);
    }

    public function test_the_admin_panel_is_notified_of_new_and_changed_orders_but_not_of_old_messages(): void
    {
        Event::fake([OrderUpdated::class]);

        $this->sync('orders/'.self::ORDER_ID, $this->order(['version' => 2]));
        $this->sync('orders/'.self::ORDER_ID, $this->order(['status' => 'shipped', 'version' => 3]));
        $this->sync('orders/'.self::ORDER_ID, $this->order(['version' => 2])); // a late retry

        Event::assertDispatchedTimes(OrderUpdated::class, 2);
        Event::assertDispatched(OrderUpdated::class, fn (OrderUpdated $event) => $event->orderId === self::ORDER_ID && $event->isNew);
        Event::assertDispatched(OrderUpdated::class, fn (OrderUpdated $event) => ! $event->isNew);
    }

    public function test_an_invalid_order_is_rejected(): void
    {
        $this->sync('orders/'.self::ORDER_ID, $this->order(['status' => 'lost', 'items' => []]))
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['status', 'items']);
    }

    public function test_stock_levels_are_saved_unless_older_than_the_copy(): void
    {
        $this->sync('stock-levels/'.self::PRODUCT_ID, ['quantity' => 48, 'version' => 3])->assertNoContent();
        $this->sync('stock-levels/'.self::PRODUCT_ID, ['quantity' => 50, 'version' => 2])->assertNoContent();

        $this->assertSame([48, 3], [StockLevel::sole()->quantity, StockLevel::sole()->version]);

        $this->sync('stock-levels/'.self::PRODUCT_ID, ['quantity' => -1, 'version' => 4])->assertUnprocessable();
    }

    private function sync(string $path, array $body): TestResponse
    {
        return $this->putJson("/internal/v1/sync/{$path}", $body, ['X-Api-Key' => self::API_KEY]);
    }

    /** An order as the gateway sends it (camelCase, its id also in the body). */
    private function order(array $overrides = []): array
    {
        return [
            'id' => self::ORDER_ID,
            'customerId' => '0199e3a0-0000-7000-8000-0000000000c1',
            'customerName' => 'Alice',
            'customerEmail' => 'alice@example.com',
            'status' => 'paid',
            'totalCents' => 7980,
            'version' => 2,
            'createdAt' => '2026-10-12T09:30:00.000Z',
            'updatedAt' => '2026-10-12T09:30:01.000Z',
            'items' => [$this->item('Desk Lamp', 2990, 2), $this->item('Rug', 2000, 1)],
            ...$overrides,
        ];
    }

    private function item(string $name, int $unitPriceCents, int $quantity): array
    {
        static $sequence = 0;
        $sequence++;

        return [
            'id' => sprintf('0199e3a0-0000-7000-8000-%012d', $sequence),
            'productId' => sprintf('0199e3a0-0000-7000-9000-%012d', $sequence),
            'productName' => $name,
            'unitPriceCents' => $unitPriceCents,
            'quantity' => $quantity,
        ];
    }
}
