<?php

namespace App\Actions\Reports;

use App\Dto\Reports\SalesReportDto;
use App\Dto\Reports\SalesReportFilterDto;
use App\Dto\Reports\SalesReportRowDto;
use App\Models\Order;
use Carbon\CarbonImmutable;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

/**
 * Sales per day, week or month: orders, units sold, revenue. Only paid, shipped and delivered orders count,
 * by the day they were placed (UTC). The report covers whole periods, e.g. a weekly report starting on
 * a Wednesday starts on that week's Monday.
 */
final readonly class BuildSalesReportAction
{
    public function execute(SalesReportFilterDto $filter): SalesReportDto
    {
        $period = $filter->period;
        $start = $period->startOf($filter->from);
        $end = $period->next($period->startOf($filter->to)); // exclusive: where the period after `to` starts

        $sales = $this->salesPerPeriod($filter, $start, $end);

        $rows = [];
        for ($periodStart = $start; $periodStart < $end; $periodStart = $period->next($periodStart)) {
            $sale = $sales->get($periodStart->toDateString());

            $rows[] = new SalesReportRowDto(
                period: $period->name($periodStart),
                orders: (int) ($sale->orders ?? 0),
                units: (int) ($sale->units ?? 0),
                revenueCents: (int) ($sale->revenue_cents ?? 0),
            );
        }

        return new SalesReportDto($period, $start, $end->subDay(), $rows);
    }

    /**
     * One row per period that had sales, keyed by the period's first day ("2026-10-12").
     *
     * @return Collection<string, object{orders: int, units: int, revenue_cents: int}>
     */
    private function salesPerPeriod(SalesReportFilterDto $filter, CarbonImmutable $start, CarbonImmutable $end): Collection
    {
        $unitsPerOrder = DB::table('order_items')
            ->select('order_id')
            ->selectRaw('sum(quantity) as units')
            ->groupBy('order_id');

        return Order::query()
            ->sold()
            ->joinSub($unitsPerOrder, 'items', 'items.order_id', '=', 'orders.id')
            ->where('orders.created_at', '>=', $start)
            ->where('orders.created_at', '<', $end)
            ->selectRaw('date_trunc(?, orders.created_at) as period_start', [$filter->period->unit()])
            ->selectRaw('count(*) as orders, sum(items.units) as units, sum(orders.total_cents) as revenue_cents')
            ->groupBy('period_start')
            ->toBase()
            ->get()
            ->keyBy(fn (object $sale) => CarbonImmutable::parse($sale->period_start)->toDateString());
    }
}
