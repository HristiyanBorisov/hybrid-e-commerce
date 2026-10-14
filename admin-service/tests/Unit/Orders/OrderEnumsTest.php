<?php

namespace Tests\Unit\Orders;

use App\Dto\Reports\SalesReportRowDto;
use App\Enums\OrderStatus;
use App\Enums\ReportPeriod;
use Carbon\CarbonImmutable;
use PHPUnit\Framework\TestCase;

final class OrderEnumsTest extends TestCase
{
    public function test_order_statuses_know_where_they_can_go_next(): void
    {
        $this->assertSame([OrderStatus::Paid, OrderStatus::Cancelled], OrderStatus::Pending->nextStatuses());
        $this->assertSame([OrderStatus::Shipped, OrderStatus::Cancelled], OrderStatus::Paid->nextStatuses());
        $this->assertSame([OrderStatus::Delivered], OrderStatus::Shipped->nextStatuses());
        $this->assertSame([], OrderStatus::Delivered->nextStatuses());
        $this->assertSame([], OrderStatus::Cancelled->nextStatuses());
        $this->assertSame([OrderStatus::Paid, OrderStatus::Shipped, OrderStatus::Delivered], OrderStatus::sold());
    }

    public function test_order_statuses_have_labels_for_badges_and_buttons(): void
    {
        $this->assertSame('Shipped', OrderStatus::Shipped->label());
        $this->assertSame('Mark as shipped', OrderStatus::Shipped->actionLabel());
        $this->assertSame('Cancel order', OrderStatus::Cancelled->actionLabel());
    }

    public function test_report_periods_start_and_end_like_postgresql_date_trunc(): void
    {
        $wednesday = CarbonImmutable::parse('2026-10-14 15:30:00');

        $this->assertSame('2026-10-14', ReportPeriod::Daily->startOf($wednesday)->toDateString());
        $this->assertSame('2026-10-12', ReportPeriod::Weekly->startOf($wednesday)->toDateString()); // Monday
        $this->assertSame('2026-10-01', ReportPeriod::Monthly->startOf($wednesday)->toDateString());
        $this->assertSame('2026-02-01', ReportPeriod::Monthly->next(CarbonImmutable::parse('2026-01-01'))->toDateString());
        $this->assertSame(['day', 'week', 'month'], array_map(fn (ReportPeriod $period) => $period->unit(), ReportPeriod::cases()));
    }

    public function test_report_periods_have_default_ranges_and_names(): void
    {
        $today = CarbonImmutable::parse('2026-10-14');

        $this->assertSame('2026-09-15', ReportPeriod::Daily->defaultFrom($today)->toDateString());
        $this->assertSame('2026-07-27', ReportPeriod::Weekly->defaultFrom($today)->toDateString());
        $this->assertSame('2025-11-01', ReportPeriod::Monthly->defaultFrom($today)->toDateString());
        $this->assertSame('Week of 2026-10-12', ReportPeriod::Weekly->name(CarbonImmutable::parse('2026-10-12')));
        $this->assertSame('October 2026', ReportPeriod::Monthly->name(CarbonImmutable::parse('2026-10-01')));
        $this->assertSame('Monthly', ReportPeriod::Monthly->label());
    }

    public function test_a_report_row_has_an_average_order_and_a_csv_line(): void
    {
        $row = new SalesReportRowDto('2026-10-12', orders: 3, units: 7, revenueCents: 10000);

        $this->assertSame(3333, $row->averageOrderCents());
        $this->assertSame(['2026-10-12', 3, 7, '100.00', '33.33'], $row->toCsvRow());
        $this->assertSame(0, (new SalesReportRowDto('2026-10-13', 0, 0, 0))->averageOrderCents());
    }
}
