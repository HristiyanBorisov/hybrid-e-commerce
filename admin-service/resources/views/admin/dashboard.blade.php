@use('App\Support\Money')

<x-app-layout>
    <x-slot name="header">
        <h2 class="font-semibold text-xl text-gray-800 leading-tight">{{ __('Dashboard') }}</h2>
    </x-slot>

    <p class="text-gray-700">{{ __('Welcome, :name.', ['name' => Auth::user()->name]) }}</p>

    {{-- Key numbers (sales = paid, shipped and delivered orders; days in UTC) --}}
    <div class="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <div class="bg-white p-6 shadow-xs sm:rounded-lg">
            <div class="text-sm text-gray-500">{{ __('Sales today') }}</div>
            <div class="mt-1 text-2xl font-semibold text-gray-900">{{ Money::format($metrics->revenueTodayCents) }}</div>
            <div class="text-sm text-gray-500">{{ trans_choice(':count order|:count orders', $metrics->ordersToday) }}</div>
        </div>
        <div class="bg-white p-6 shadow-xs sm:rounded-lg">
            <div class="text-sm text-gray-500">{{ __('Sales this month') }}</div>
            <div class="mt-1 text-2xl font-semibold text-gray-900">{{ Money::format($metrics->revenueThisMonthCents) }}</div>
            <div class="text-sm text-gray-500">{{ trans_choice(':count order|:count orders', $metrics->ordersThisMonth) }}</div>
        </div>
        <a href="{{ route('admin.orders.index', ['status' => 'paid']) }}" class="bg-white p-6 shadow-xs sm:rounded-lg hover:bg-gray-50">
            <div class="text-sm text-gray-500">{{ __('Orders to ship') }}</div>
            <div class="mt-1 text-2xl font-semibold text-gray-900">{{ $metrics->ordersToShip }}</div>
            <div class="text-sm text-gray-500">{{ __('paid, not shipped yet') }}</div>
        </a>
        <div class="bg-white p-6 shadow-xs sm:rounded-lg">
            <div class="text-sm text-gray-500">{{ __('Running low') }}</div>
            <div @class(['mt-1 text-2xl font-semibold', 'text-red-600' => $metrics->lowStockProducts->isNotEmpty(), 'text-gray-900' => $metrics->lowStockProducts->isEmpty()])>
                {{ $metrics->lowStockProducts->count() }}
            </div>
            <div class="text-sm text-gray-500">{{ __('products with :count or fewer in stock', ['count' => $lowStock]) }}</div>
        </div>
    </div>

    <div class="grid gap-6 lg:grid-cols-3">
        {{-- Latest orders --}}
        <div class="bg-white shadow-xs sm:rounded-lg lg:col-span-2">
            <div class="flex items-center justify-between px-4 py-3">
                <h3 class="font-medium text-gray-900">{{ __('Latest orders') }}</h3>
                <a href="{{ route('admin.orders.index') }}" class="text-sm text-indigo-600 hover:text-indigo-900">{{ __('All orders') }}</a>
            </div>
            <table class="min-w-full divide-y divide-gray-200 text-sm">
                <tbody class="divide-y divide-gray-100">
                    @forelse ($metrics->latestOrders as $order)
                        <tr>
                            <td class="px-4 py-2 text-gray-500">{{ $order->created_at->format('Y-m-d H:i') }}</td>
                            <td class="px-4 py-2 text-gray-900">
                                <a href="{{ route('admin.orders.show', $order->id) }}" class="hover:text-indigo-700">{{ $order->customer_name }}</a>
                            </td>
                            <td class="px-4 py-2 text-right text-gray-900">{{ Money::format($order->total_cents) }}</td>
                            <td class="px-4 py-2 text-right"><x-order-status :status="$order->status" /></td>
                        </tr>
                    @empty
                        <tr><td class="px-4 py-6 text-center text-gray-500">{{ __('No orders yet.') }}</td></tr>
                    @endforelse
                </tbody>
            </table>
        </div>

        {{-- Products running low --}}
        <div class="bg-white shadow-xs sm:rounded-lg">
            <div class="px-4 py-3">
                <h3 class="font-medium text-gray-900">{{ __('Running low on stock') }}</h3>
            </div>
            <table class="min-w-full divide-y divide-gray-200 text-sm">
                <tbody class="divide-y divide-gray-100">
                    @forelse ($metrics->lowStockProducts->take(8) as $product)
                        <tr>
                            <td class="px-4 py-2 text-gray-900">
                                <a href="{{ route('admin.products.edit', $product->id) }}" class="hover:text-indigo-700">{{ $product->name }}</a>
                            </td>
                            <td class="px-4 py-2 text-right font-medium text-red-600">{{ $product->stock() }}</td>
                        </tr>
                    @empty
                        <tr><td class="px-4 py-6 text-center text-gray-500">{{ __('Every product is well stocked.') }}</td></tr>
                    @endforelse
                </tbody>
            </table>
        </div>
    </div>
</x-app-layout>
