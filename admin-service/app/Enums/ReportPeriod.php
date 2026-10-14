<?php

namespace App\Enums;

use Carbon\CarbonImmutable;
use Carbon\CarbonInterface;

/** How a sales report groups the orders. Weeks start on Monday, like PostgreSQL's date_trunc('week'). */
enum ReportPeriod: string
{
    case Daily = 'daily';
    case Weekly = 'weekly';
    case Monthly = 'monthly';

    public function label(): string
    {
        return ucfirst($this->value);
    }

    /** The unit for PostgreSQL's date_trunc() */
    public function unit(): string
    {
        return match ($this) {
            self::Daily => 'day',
            self::Weekly => 'week',
            self::Monthly => 'month',
        };
    }

    /** Where the period that contains $date starts */
    public function startOf(CarbonImmutable $date): CarbonImmutable
    {
        return match ($this) {
            self::Daily => $date->startOfDay(),
            self::Weekly => $date->startOfWeek(CarbonInterface::MONDAY),
            self::Monthly => $date->startOfMonth(),
        };
    }

    /** Where the next period starts */
    public function next(CarbonImmutable $periodStart): CarbonImmutable
    {
        return match ($this) {
            self::Daily => $periodStart->addDay(),
            self::Weekly => $periodStart->addWeek(),
            self::Monthly => $periodStart->addMonthNoOverflow(),
        };
    }

    /** Without dates, a report covers the last 30 days, 12 weeks or 12 months up to $to */
    public function defaultFrom(CarbonImmutable $to): CarbonImmutable
    {
        return match ($this) {
            self::Daily => $to->subDays(29),
            self::Weekly => $this->startOf($to)->subWeeks(11),
            self::Monthly => $this->startOf($to)->subMonthsNoOverflow(11),
        };
    }

    /** How a period is shown: "2026-10-12", "Week of 2026-10-05", "October 2026" */
    public function name(CarbonImmutable $periodStart): string
    {
        return match ($this) {
            self::Daily => $periodStart->toDateString(),
            self::Weekly => 'Week of '.$periodStart->toDateString(),
            self::Monthly => $periodStart->format('F Y'),
        };
    }
}
