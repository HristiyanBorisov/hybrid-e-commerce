<?php

namespace App\Dto\Reports;

use App\Support\Money;

/** The sales of one period (or the totals of a report). */
final readonly class SalesReportRowDto
{
    /** Columns of the CSV export, in the order of toCsvRow() */
    public const CSV_COLUMNS = ['period', 'orders', 'units_sold', 'revenue', 'average_order'];

    public function __construct(
        /** e.g. "2026-10-12", "Week of 2026-10-05", "October 2026" */
        public string $period,
        public int $orders,
        public int $units,
        public int $revenueCents,
    ) {}

    public function averageOrderCents(): int
    {
        return $this->orders > 0 ? (int) round($this->revenueCents / $this->orders) : 0;
    }

    /** @return list<string|int> */
    public function toCsvRow(): array
    {
        return [
            $this->period,
            $this->orders,
            $this->units,
            Money::toDecimal($this->revenueCents),
            Money::toDecimal($this->averageOrderCents()),
        ];
    }
}
