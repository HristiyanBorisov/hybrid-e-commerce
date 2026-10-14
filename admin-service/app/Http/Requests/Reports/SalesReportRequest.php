<?php

namespace App\Http\Requests\Reports;

use App\Dto\Reports\SalesReportFilterDto;
use App\Enums\ReportPeriod;
use Carbon\CarbonImmutable;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/** ?period=daily|weekly|monthly&from=&to= — without dates: the last 30 days, 12 weeks or 12 months. */
final class SalesReportRequest extends FormRequest
{
    /** @return array<string, array<int, mixed>> */
    public function rules(): array
    {
        return [
            'period' => ['nullable', Rule::enum(ReportPeriod::class)],
            'from' => ['nullable', 'date_format:Y-m-d'],
            'to' => ['nullable', 'date_format:Y-m-d', 'after_or_equal:from'],
        ];
    }

    public function toDto(): SalesReportFilterDto
    {
        $period = $this->enum('period', ReportPeriod::class) ?? ReportPeriod::Daily;
        $to = $this->date('to', 'Y-m-d')?->toImmutable() ?? CarbonImmutable::today();

        return new SalesReportFilterDto(
            period: $period,
            from: $this->date('from', 'Y-m-d')?->toImmutable() ?? $period->defaultFrom($to),
            to: $to,
        );
    }
}
