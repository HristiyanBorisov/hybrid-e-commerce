<?php

namespace Tests\Feature\Orders;

use App\Enums\OrderStatus;
use App\Events\OrderUpdated;
use App\Models\Order;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Client\Request as ClientRequest;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Http;
use Tests\Support\TestTokens;
use Tests\TestCase;

final class OrdersTest extends TestCase
{
    use RefreshDatabase;

    public function test_the_list_shows_orders_newest_first(): void
    {
        Order::factory()->placedAt('2026-10-01 10:00:00')->create(['customer_name' => 'Older Order']);
        Order::factory()->placedAt('2026-10-02 10:00:00')->withItems([1500, 2], [1000, 1])->create(['customer_name' => 'Newer Order']);

        $this->actingAsAdmin()
            ->get('/admin/orders')
            ->assertOk()
            ->assertSeeInOrder(['Newer Order', '3', '40.00', 'Paid', 'Older Order']);
    }

    public function test_the_list_filters_by_status_customer_and_date(): void
    {
        Order::factory()->status(OrderStatus::Shipped)->placedAt('2026-10-05 10:00:00')->create(['customer_name' => 'Alice', 'customer_email' => 'alice@example.com']);
        Order::factory()->status(OrderStatus::Paid)->placedAt('2026-10-05 12:00:00')->create(['customer_name' => 'Alice Again', 'customer_email' => 'alice@example.com']);
        Order::factory()->status(OrderStatus::Shipped)->placedAt('2026-10-09 10:00:00')->create(['customer_name' => 'Bob', 'customer_email' => 'bob@example.com']);

        $this->actingAsAdmin()
            ->get('/admin/orders?status=shipped&search=ALICE@&from=2026-10-01&to=2026-10-05')
            ->assertOk()
            ->assertSee('Alice')
            ->assertDontSee('Alice Again')
            ->assertDontSee('Bob');
    }

    public function test_invalid_filters_are_rejected(): void
    {
        $this->actingAsAdmin()
            ->get('/admin/orders?status=lost&from=2026-10-09&to=2026-10-01')
            ->assertSessionHasErrors(['status', 'to']);
    }

    public function test_an_order_shows_its_items_and_only_the_next_possible_statuses(): void
    {
        $order = Order::factory()->status(OrderStatus::Paid)->withItems([2990, 2])->create();

        $this->actingAsAdmin()
            ->get("/admin/orders/{$order->id}")
            ->assertOk()
            ->assertSee($order->customer_email)
            ->assertSee('59.80')
            ->assertSee('Mark as shipped')
            ->assertSee('Cancel order')
            ->assertDontSee('Mark as delivered');

        $delivered = Order::factory()->status(OrderStatus::Delivered)->create();
        $this->actingAsAdmin()->get("/admin/orders/{$delivered->id}")->assertSee('This order is final.');
    }

    public function test_the_status_change_goes_through_the_gateway_and_the_copy_shows_it_at_once(): void
    {
        Event::fake([OrderUpdated::class]);
        $order = Order::factory()->status(OrderStatus::Paid)->create(['version' => 2]);
        Http::fake([$this->gatewayUrl("orders/{$order->id}/status") => Http::response([
            'id' => $order->id,
            'status' => 'shipped',
            'version' => 3,
            'updatedAt' => '2026-10-12T16:00:00.000Z',
        ])]);

        $this->actingAsAdmin()
            ->patch("/admin/orders/{$order->id}/status", ['status' => 'shipped'])
            ->assertRedirect("/admin/orders/{$order->id}")
            ->assertSessionHas('status', 'Order marked as shipped.');

        Http::assertSent(fn (ClientRequest $request) => $request->method() === 'PATCH'
            && $request->data() === ['status' => 'shipped']
            && $request->hasHeader('Authorization', 'Bearer '.TestTokens::admin()));
        $this->assertSame([OrderStatus::Shipped, 3, '2026-10-12 16:00:00'], [
            $order->fresh()->status, $order->fresh()->version, $order->fresh()->updated_at->toDateTimeString(),
        ]);
        Event::assertDispatched(OrderUpdated::class, fn (OrderUpdated $event) => $event->orderId === $order->id && ! $event->isNew);
    }

    public function test_an_answer_older_than_the_copy_does_not_overwrite_it(): void
    {
        $order = Order::factory()->status(OrderStatus::Paid)->create(['version' => 5]);
        Http::fake(['*' => Http::response(['id' => $order->id, 'status' => 'shipped', 'version' => 4, 'updatedAt' => '2026-10-12T16:00:00Z'])]);

        Event::fake([OrderUpdated::class]);

        $this->actingAsAdmin()->patch("/admin/orders/{$order->id}/status", ['status' => 'shipped']);

        $this->assertSame(OrderStatus::Paid, $order->fresh()->status);
        Event::assertNotDispatched(OrderUpdated::class);
    }

    public function test_a_status_the_order_cannot_move_to_never_reaches_the_gateway(): void
    {
        $order = Order::factory()->status(OrderStatus::Paid)->create();

        $this->actingAsAdmin()
            ->patch("/admin/orders/{$order->id}/status", ['status' => 'delivered'])
            ->assertSessionHasErrors('status');

        Http::assertNothingSent();
    }

    public function test_the_gateways_refusal_is_shown(): void
    {
        $order = Order::factory()->status(OrderStatus::Paid)->create();
        Http::fake(['*' => Http::response(['statusCode' => 409, 'message' => "A cancelled order can't be changed to shipped"], 409)]);

        $this->actingAsAdmin()
            ->from("/admin/orders/{$order->id}")
            ->patch("/admin/orders/{$order->id}/status", ['status' => 'shipped'])
            ->assertRedirect("/admin/orders/{$order->id}")
            ->assertSessionHas('error', "A cancelled order can't be changed to shipped");
    }
}
