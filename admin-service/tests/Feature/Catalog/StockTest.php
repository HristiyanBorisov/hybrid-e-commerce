<?php

namespace Tests\Feature\Catalog;

use App\Models\Product;
use App\Models\StockLevel;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Client\Request as ClientRequest;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

/** Stock is owned by the API gateway: the admin panel shows its copy and adjusts stock through the gateway. */
final class StockTest extends TestCase
{
    use RefreshDatabase;

    public function test_the_product_list_and_page_show_the_stock(): void
    {
        $lamp = Product::factory()->create(['name' => 'Desk Lamp']);
        StockLevel::create(['product_id' => $lamp->id, 'quantity' => 42, 'version' => 2]);
        Product::factory()->create(['name' => 'Never Stocked']);

        $this->actingAsAdmin()->get('/admin/products')->assertSeeInOrder(['Never Stocked', '0', 'Desk Lamp', '42']);
        $this->actingAsAdmin()->get("/admin/products/{$lamp->id}/edit")->assertSee('42 in stock');
    }

    public function test_an_adjustment_goes_through_the_gateway_and_the_copy_shows_it_at_once(): void
    {
        $lamp = Product::factory()->create(['name' => 'Desk Lamp']);
        StockLevel::create(['product_id' => $lamp->id, 'quantity' => 10, 'version' => 2]);
        Http::fake([$this->gatewayUrl("inventory/{$lamp->id}/adjustments") => Http::response(
            ['productId' => $lamp->id, 'quantity' => 35, 'version' => 3], 201,
        )]);

        $this->actingAsAdmin()
            ->from("/admin/products/{$lamp->id}/edit")
            ->post("/admin/products/{$lamp->id}/stock-adjustments", ['quantity_change' => 25])
            ->assertRedirect("/admin/products/{$lamp->id}/edit")
            ->assertSessionHas('status', '"Desk Lamp" now has 35 in stock.');

        Http::assertSent(fn (ClientRequest $request) => $request->data() === ['quantityChange' => 25]);
        $this->assertSame([35, 3], [$lamp->stockLevel()->sole()->quantity, $lamp->stockLevel()->sole()->version]);
    }

    public function test_the_gateways_refusal_is_shown(): void
    {
        $lamp = Product::factory()->create();
        Http::fake(['*' => Http::response(['statusCode' => 409, 'message' => "Stock can't go below 0: 3 in stock"], 409)]);

        $this->actingAsAdmin()
            ->post("/admin/products/{$lamp->id}/stock-adjustments", ['quantity_change' => -5])
            ->assertSessionHas('error', "Stock can't go below 0: 3 in stock");
    }

    public function test_the_change_must_be_a_whole_number_other_than_zero(): void
    {
        $lamp = Product::factory()->create();

        $this->actingAsAdmin()
            ->post("/admin/products/{$lamp->id}/stock-adjustments", ['quantity_change' => 0])
            ->assertSessionHasErrors('quantity_change');
        $this->actingAsAdmin()
            ->post("/admin/products/{$lamp->id}/stock-adjustments", ['quantity_change' => 1.5])
            ->assertSessionHasErrors('quantity_change');

        Http::assertNothingSent();
    }
}
