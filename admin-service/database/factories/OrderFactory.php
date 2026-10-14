<?php

namespace Database\Factories;

use App\Enums\OrderStatus;
use App\Models\Order;
use App\Models\OrderItem;
use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/** @extends Factory<Order> */
class OrderFactory extends Factory
{
    protected $model = Order::class;

    /** @return array<string, mixed> */
    public function definition(): array
    {
        $placedAt = CarbonImmutable::now()->subMinutes(fake()->numberBetween(1, 600));

        return [
            'id' => (string) Str::uuid7(),
            'customer_id' => (string) Str::uuid7(),
            'customer_name' => fake()->name(),
            'customer_email' => fake()->unique()->safeEmail(),
            'status' => OrderStatus::Paid,
            'total_cents' => 0,
            'version' => 2,
            'created_at' => $placedAt,
            'updated_at' => $placedAt,
        ];
    }

    public function status(OrderStatus $status): static
    {
        return $this->state(['status' => $status]);
    }

    public function placedAt(string $dateTime): static
    {
        return $this->state(['created_at' => $dateTime, 'updated_at' => $dateTime]);
    }

    /** One item per [price in cents, quantity] pair; the order's total is their sum. */
    public function withItems(array ...$lines): static
    {
        return $this
            ->state(['total_cents' => array_sum(array_map(fn (array $line) => $line[0] * $line[1], $lines))])
            ->afterCreating(function (Order $order) use ($lines): void {
                foreach ($lines as [$unitPriceCents, $quantity]) {
                    OrderItem::factory()->for($order)->create([
                        'unit_price_cents' => $unitPriceCents,
                        'quantity' => $quantity,
                    ]);
                }
            });
    }
}
