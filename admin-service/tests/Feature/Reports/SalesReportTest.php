<?php

namespace Tests\Feature\Reports;

use App\Enums\OrderStatus;
use App\Models\Order;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

final class SalesReportTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->travelTo('2026-10-14 12:00:00'); // a Wednesday

        // Monday 12 Oct: two sales (one late at night) and orders that don't count
        Order::factory()->placedAt('2026-10-12 08:00:00')->withItems([1000, 2])->create();
        Order::factory()->placedAt('2026-10-12 23:59:59')->status(OrderStatus::Delivered)->withItems([500, 1], [250, 4])->create();
        Order::factory()->placedAt('2026-10-12 09:00:00')->status(OrderStatus::Cancelled)->withItems([9900, 1])->create();
        Order::factory()->placedAt('2026-10-12 10:00:00')->status(OrderStatus::Pending)->withItems([9900, 1])->create();
        // Tuesday 13 Oct: nothing. Wednesday 14 Oct: one sale
        Order::factory()->placedAt('2026-10-14 07:30:00')->status(OrderStatus::Shipped)->withItems([3000, 1])->create();
        // September: one sale
        Order::factory()->placedAt('2026-09-30 22:00:00')->withItems([700, 3])->create();
    }

    public function test_daily_sales_list_every_day_with_the_sold_orders_only(): void
    {
        $this->actingAsAdmin()
            ->get('/admin/reports/sales?period=daily&from=2026-10-12&to=2026-10-14')
            ->assertOk()
            ->assertSeeInOrder([
                '2026-10-12', '2', '7', '35.00', '17.50',
                '2026-10-13', '0', '0', '0.00', '0.00',
                '2026-10-14', '1', '1', '30.00', '30.00',
                'Total', '3', '8', '65.00', '21.67',
            ]);
    }

    public function test_weekly_and_monthly_sales_cover_whole_periods(): void
    {
        $this->actingAsAdmin()
            ->get('/admin/reports/sales?period=weekly&from=2026-09-30&to=2026-10-14')
            ->assertSeeInOrder(['Week of 2026-09-28', '1', '3', '21.00', 'Week of 2026-10-05', '0', 'Week of 2026-10-12', '3', '8', '65.00']);

        $this->actingAsAdmin()
            ->get('/admin/reports/sales?period=monthly&from=2026-09-15&to=2026-10-14')
            ->assertSeeInOrder(['September 2026', '1', '3', '21.00', 'October 2026', '3', '8', '65.00', 'Total', '4', '11', '86.00']);
    }

    public function test_without_dates_the_report_covers_the_last_30_days(): void
    {
        $this->actingAsAdmin()
            ->get('/admin/reports/sales')
            ->assertOk()
            ->assertSee('value="2026-09-15"', escape: false)
            ->assertSee('value="2026-10-14"', escape: false)
            ->assertSeeInOrder(['2026-09-15', '2026-10-14', 'Total', '4']);
    }

    public function test_the_report_downloads_as_csv(): void
    {
        $response = $this->actingAsAdmin()->get('/admin/reports/sales/csv?period=daily&from=2026-10-12&to=2026-10-13');

        $response->assertOk()
            ->assertDownload('sales-daily-2026-10-12-to-2026-10-13.csv');
        $this->assertSame(
            "period,orders,units_sold,revenue,average_order\n2026-10-12,2,7,35.00,17.50\n2026-10-13,0,0,0.00,0.00\n",
            $response->streamedContent(),
        );
    }

    public function test_the_report_downloads_as_pdf(): void
    {
        $response = $this->actingAsAdmin()->get('/admin/reports/sales/pdf?period=monthly&from=2026-10-01&to=2026-10-31');

        $response->assertOk()->assertDownload('sales-monthly-2026-10-01-to-2026-10-31.pdf');
        $this->assertSame('application/pdf', $response->headers->get('Content-Type'));
        $this->assertStringStartsWith('%PDF', $response->getContent());
    }

    public function test_invalid_options_are_rejected(): void
    {
        $this->actingAsAdmin()
            ->get('/admin/reports/sales?period=yearly&from=2026-10-14&to=2026-10-01')
            ->assertSessionHasErrors(['period', 'to']);
    }
}
