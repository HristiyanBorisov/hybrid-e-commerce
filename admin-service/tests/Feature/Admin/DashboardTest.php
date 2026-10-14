<?php

namespace Tests\Feature\Admin;

use App\Enums\OrderStatus;
use App\Models\Order;
use App\Models\Product;
use App\Models\StockLevel;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

final class DashboardTest extends TestCase
{
    use RefreshDatabase;

    public function test_it_shows_todays_and_this_months_sales_and_the_orders_to_ship(): void
    {
        $this->travelTo('2026-10-14 12:00:00');
        Order::factory()->placedAt('2026-10-14 09:00:00')->withItems([1000, 1])->create(['customer_name' => 'Today Customer']);
        Order::factory()->placedAt('2026-10-14 10:00:00')->status(OrderStatus::Cancelled)->withItems([9900, 1])->create();
        Order::factory()->placedAt('2026-10-02 10:00:00')->status(OrderStatus::Delivered)->withItems([2500, 2])->create();
        Order::factory()->placedAt('2026-09-30 10:00:00')->withItems([7000, 1])->create();

        $this->actingAsAdmin()
            ->get('/admin')
            ->assertOk()
            ->assertSeeInOrder(['Sales today', '10.00', '1 order', 'Sales this month', '60.00', '2 orders', 'Orders to ship', '2'])
            ->assertSeeInOrder(['Latest orders', 'Today Customer']);
    }

    public function test_it_lists_the_products_running_low_fewest_first(): void
    {
        $low = Product::factory()->create(['name' => 'Almost Gone']);
        StockLevel::create(['product_id' => $low->id, 'quantity' => 3, 'version' => 2]);
        $plenty = Product::factory()->create(['name' => 'Plenty Left']);
        StockLevel::create(['product_id' => $plenty->id, 'quantity' => 40, 'version' => 2]);
        Product::factory()->create(['name' => 'Never Stocked']);

        $this->actingAsAdmin()
            ->get('/admin')
            ->assertSeeInOrder(['Running low on stock', 'Never Stocked', '0', 'Almost Gone', '3'])
            ->assertDontSee('Plenty Left');
    }

    public function test_an_empty_shop_shows_friendly_placeholders(): void
    {
        $this->actingAsAdmin()
            ->get('/admin')
            ->assertSee('No orders yet.')
            ->assertSee('Every product is well stocked.');
    }
}
