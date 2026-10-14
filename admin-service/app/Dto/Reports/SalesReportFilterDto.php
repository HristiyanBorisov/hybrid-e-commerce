<?php

namespace App\Dto\Reports;

use App\Enums\ReportPeriod;
use Carbon\CarbonImmutable;

/** Which sales report to build: how to group it, and the days it covers (both included). */
final readonly class SalesReportFilterDto
{
    public function __construct(
        public ReportPeriod $period,
        public CarbonImmutable $from,
        public CarbonImmutable $to,
    ) {}
}
