@use('App\Support\Money')

<x-app-layout>
    <x-slot name="header">
        <div class="flex flex-wrap items-center justify-between gap-3">
            <h2 class="font-semibold text-xl text-gray-800 leading-tight">{{ __('Sales report') }}</h2>

            @php($exportQuery = ['period' => $report->period->value, 'from' => $report->from->toDateString(), 'to' => $report->to->toDateString()])
            <div class="flex gap-3">
                <a href="{{ route('admin.reports.sales.csv', $exportQuery) }}" class="inline-flex items-center px-4 py-2 text-sm text-gray-700 hover:text-gray-900">{{ __('Export CSV') }}</a>
                <a href="{{ route('admin.reports.sales.pdf', $exportQuery) }}" class="inline-flex items-center px-4 py-2 text-sm text-gray-700 hover:text-gray-900">{{ __('Export PDF') }}</a>
            </div>
        </div>
    </x-slot>

    <form method="GET" action="{{ route('admin.reports.sales') }}" class="flex flex-wrap items-end gap-4 bg-white p-4 shadow-xs sm:rounded-lg">
        <div>
            <x-input-label for="period" :value="__('Group by')" />
            <x-select id="period" name="period">
                @foreach ($periods as $period)
                    <option value="{{ $period->value }}" @selected($report->period === $period)>{{ $period->label() }}</option>
                @endforeach
            </x-select>
        </div>

        <div>
            <x-input-label for="from" :value="__('From')" />
            <x-text-input id="from" name="from" type="date" class="mt-1 block" :value="$report->from->toDateString()" />
        </div>

        <div>
            <x-input-label for="to" :value="__('To')" />
            <x-text-input id="to" name="to" type="date" class="mt-1 block" :value="$report->to->toDateString()" />
        </div>

        <x-primary-button>{{ __('Show') }}</x-primary-button>
        <x-input-error :messages="$errors->all()" />
    </form>

    <p class="text-sm text-gray-600">
        {{ __('Paid, shipped and delivered orders, by the day they were placed (UTC). Pending and cancelled orders are not counted.') }}
    </p>

    @include('admin.reports.partials.table', ['report' => $report])
</x-app-layout>
