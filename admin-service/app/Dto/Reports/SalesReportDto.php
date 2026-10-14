<?php

namespace App\Dto\Reports;

use App\Enums\ReportPeriod;
use Carbon\CarbonImmutable;

/** A sales report: one row per period, oldest first — periods without sales included, with zeros. */
final readonly class SalesReportDto
{
    /** @param list<SalesReportRowDto> $rows */
    public function __construct(
        public ReportPeriod $period,
        /** First day covered: the start of the first period */
        public CarbonImmutable $from,
        /** Last day covered: the end of the last period */
        public CarbonImmutable $to,
        public array $rows,
    ) {}

    public function totals(): SalesReportRowDto
    {
        return new SalesReportRowDto(
            period: 'Total',
            orders: array_sum(array_map(fn (SalesReportRowDto $row) => $row->orders, $this->rows)),
            units: array_sum(array_map(fn (SalesReportRowDto $row) => $row->units, $this->rows)),
            revenueCents: array_sum(array_map(fn (SalesReportRowDto $row) => $row->revenueCents, $this->rows)),
        );
    }

    /** e.g. "sales-daily-2026-09-13-to-2026-10-12.csv" */
    public function fileName(string $extension): string
    {
        return "sales-{$this->period->value}-{$this->from->toDateString()}-to-{$this->to->toDateString()}.{$extension}";
    }
}
