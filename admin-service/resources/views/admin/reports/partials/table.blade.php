@use('App\Support\Money')

{{-- The report's table — shared by the page and the PDF (which has no Tailwind, hence the plain class names too) --}}
@php($totals = $report->totals())
<div class="bg-white shadow-xs sm:rounded-lg overflow-x-auto">
    <table class="report min-w-full divide-y divide-gray-200 text-sm">
        <thead class="bg-gray-50 text-left text-gray-600">
            <tr>
                <th class="px-4 py-3 font-medium">{{ __('Period') }}</th>
                <th class="number px-4 py-3 font-medium text-right">{{ __('Orders') }}</th>
                <th class="number px-4 py-3 font-medium text-right">{{ __('Units sold') }}</th>
                <th class="number px-4 py-3 font-medium text-right">{{ __('Revenue') }}</th>
                <th class="number px-4 py-3 font-medium text-right">{{ __('Average order') }}</th>
            </tr>
        </thead>
        <tbody class="divide-y divide-gray-100">
            @foreach ($report->rows as $row)
                <tr @class(['text-gray-400' => $row->orders === 0, 'empty' => $row->orders === 0])>
                    <td class="px-4 py-2">{{ $row->period }}</td>
                    <td class="number px-4 py-2 text-right">{{ $row->orders }}</td>
                    <td class="number px-4 py-2 text-right">{{ $row->units }}</td>
                    <td class="number px-4 py-2 text-right">{{ Money::format($row->revenueCents) }}</td>
                    <td class="number px-4 py-2 text-right">{{ Money::format($row->averageOrderCents()) }}</td>
                </tr>
            @endforeach
        </tbody>
        <tfoot class="bg-gray-50 font-semibold text-gray-900">
            <tr class="total">
                <td class="px-4 py-3">{{ __('Total') }}</td>
                <td class="number px-4 py-3 text-right">{{ $totals->orders }}</td>
                <td class="number px-4 py-3 text-right">{{ $totals->units }}</td>
                <td class="number px-4 py-3 text-right">{{ Money::format($totals->revenueCents) }}</td>
                <td class="number px-4 py-3 text-right">{{ Money::format($totals->averageOrderCents()) }}</td>
            </tr>
        </tfoot>
    </table>
</div>
