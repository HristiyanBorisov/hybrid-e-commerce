<?php

namespace App\Dto\Dashboard;

use App\Models\Order;
use App\Models\Product;
use Illuminate\Support\Collection;

/** The numbers on the dashboard. Money is in cents; "today" and "this month" are in UTC. */
final readonly class DashboardMetricsDto
{
    /**
     * @param  Collection<int, Product>  $lowStockProducts
     * @param  Collection<int, Order>  $latestOrders
     */
    public function __construct(
        public int $revenueTodayCents,
        public int $ordersToday,
        public int $revenueThisMonthCents,
        public int $ordersThisMonth,
        /** Paid, waiting to be shipped */
        public int $ordersToShip,
        public Collection $lowStockProducts,
        public Collection $latestOrders,
    ) {}
}
