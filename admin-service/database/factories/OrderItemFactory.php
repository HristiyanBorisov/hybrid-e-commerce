<?php

namespace Database\Factories;

use App\Models\Order;
use App\Models\OrderItem;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/** @extends Factory<OrderItem> */
class OrderItemFactory extends Factory
{
    protected $model = OrderItem::class;

    /** @return array<string, mixed> */
    public function definition(): array
    {
        return [
            'id' => (string) Str::uuid7(),
            'order_id' => Order::factory(),
            'product_id' => (string) Str::uuid7(),
            'product_name' => Str::title(fake()->words(2, true)),
            'unit_price_cents' => fake()->numberBetween(199, 9_999),
            'quantity' => fake()->numberBetween(1, 3),
        ];
    }
}
