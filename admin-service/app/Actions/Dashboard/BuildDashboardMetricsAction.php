<?php

namespace App\Actions\Dashboard;

use App\Dto\Dashboard\DashboardMetricsDto;
use App\Enums\OrderStatus;
use App\Models\Order;
use App\Models\Product;
use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Collection;

/** Sales today and this month, orders to ship, products running low and the latest orders. */
final readonly class BuildDashboardMetricsAction
{
    /** A product with this many units or fewer is "running low" */
    public const LOW_STOCK = 5;

    public function execute(): DashboardMetricsDto
    {
        $today = CarbonImmutable::today();
        $soldToday = Order::query()->sold()->where('created_at', '>=', $today);
        $soldThisMonth = Order::query()->sold()->where('created_at', '>=', $today->startOfMonth());

        return new DashboardMetricsDto(
            revenueTodayCents: (int) $soldToday->clone()->sum('total_cents'),
            ordersToday: $soldToday->count(),
            revenueThisMonthCents: (int) $soldThisMonth->clone()->sum('total_cents'),
            ordersThisMonth: $soldThisMonth->count(),
            ordersToShip: Order::query()->where('status', OrderStatus::Paid)->count(),
            lowStockProducts: $this->lowStockProducts(),
            latestOrders: Order::query()->orderByDesc('created_at')->limit(5)->get(),
        );
    }

    /**
     * Products with at most LOW_STOCK units — also those never stocked — fewest first.
     *
     * @return Collection<int, Product>
     */
    private function lowStockProducts(): Collection
    {
        return Product::query()
            ->with('stockLevel')
            ->whereDoesntHave('stockLevel', fn (Builder $query) => $query->where('quantity', '>', self::LOW_STOCK))
            ->get()
            ->sortBy(fn (Product $product) => $product->stock())
            ->values();
    }
}
