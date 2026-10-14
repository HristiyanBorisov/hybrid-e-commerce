@use('App\Support\Money')

<x-app-layout>
    <x-slot name="header">
        <h2 class="font-semibold text-xl text-gray-800 leading-tight">{{ __('Orders') }}</h2>
    </x-slot>

    {{-- Filters --}}
    <form method="GET" action="{{ route('admin.orders.index') }}" class="flex flex-wrap items-end gap-4 bg-white p-4 shadow-xs sm:rounded-lg">
        <div>
            <x-input-label for="search" :value="__('Customer name or email')" />
            <x-text-input id="search" name="search" type="search" class="mt-1 block" :value="$filter->search" />
        </div>

        <div>
            <x-input-label for="status" :value="__('Status')" />
            <x-select id="status" name="status">
                <option value="">{{ __('All statuses') }}</option>
                @foreach ($statuses as $status)
                    <option value="{{ $status->value }}" @selected($filter->status === $status)>{{ $status->label() }}</option>
                @endforeach
            </x-select>
        </div>

        <div>
            <x-input-label for="from" :value="__('Placed from')" />
            <x-text-input id="from" name="from" type="date" class="mt-1 block" :value="$filter->from?->toDateString()" />
        </div>

        <div>
            <x-input-label for="to" :value="__('to')" />
            <x-text-input id="to" name="to" type="date" class="mt-1 block" :value="$filter->to?->toDateString()" />
        </div>

        <x-primary-button>{{ __('Filter') }}</x-primary-button>
        <x-input-error :messages="$errors->all()" />
    </form>

    {{-- List --}}
    <div class="bg-white shadow-xs sm:rounded-lg overflow-x-auto">
        <table class="min-w-full divide-y divide-gray-200 text-sm">
            <thead class="bg-gray-50 text-left text-gray-600">
                <tr>
                    <th class="px-4 py-3 font-medium">{{ __('Placed') }}</th>
                    <th class="px-4 py-3 font-medium">{{ __('Customer') }}</th>
                    <th class="px-4 py-3 font-medium text-right">{{ __('Items') }}</th>
                    <th class="px-4 py-3 font-medium text-right">{{ __('Total') }}</th>
                    <th class="px-4 py-3 font-medium">{{ __('Status') }}</th>
                    <th class="px-4 py-3"></th>
                </tr>
            </thead>
            <tbody class="divide-y divide-gray-100">
                @forelse ($orders as $order)
                    <tr>
                        <td class="px-4 py-3 text-gray-500">{{ $order->created_at->format('Y-m-d H:i') }}</td>
                        <td class="px-4 py-3">
                            <div class="text-gray-900">{{ $order->customer_name }}</div>
                            <div class="text-xs text-gray-500">{{ $order->customer_email }}</div>
                        </td>
                        <td class="px-4 py-3 text-right text-gray-700">{{ $order->units }}</td>
                        <td class="px-4 py-3 text-right text-gray-900">{{ Money::format($order->total_cents) }}</td>
                        <td class="px-4 py-3"><x-order-status :status="$order->status" /></td>
                        <td class="px-4 py-3 text-right">
                            <a href="{{ route('admin.orders.show', $order->id) }}" class="text-indigo-600 hover:text-indigo-900">{{ __('View') }}</a>
                        </td>
                    </tr>
                @empty
                    <tr>
                        <td colspan="6" class="px-4 py-6 text-center text-gray-500">{{ __('No orders found.') }}</td>
                    </tr>
                @endforelse
            </tbody>
        </table>
    </div>

    {{ $orders->links() }}
</x-app-layout>
