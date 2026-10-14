@use('App\Enums\OrderStatus')
@use('App\Support\Money')

<x-app-layout>
    <x-slot name="header">
        <div class="flex flex-wrap items-center justify-between gap-3">
            <h2 class="font-semibold text-xl text-gray-800 leading-tight">
                {{ __('Order') }} <span class="font-mono text-base text-gray-500">{{ $order->id }}</span>
            </h2>
            <a href="{{ route('admin.orders.index') }}" class="text-sm text-gray-700 hover:text-gray-900">{{ __('All orders') }}</a>
        </div>
    </x-slot>

    <div class="grid gap-6 md:grid-cols-3">
        <div class="bg-white p-6 shadow-xs sm:rounded-lg space-y-1 text-sm">
            <div class="text-gray-500">{{ __('Customer') }}</div>
            <div class="text-gray-900">{{ $order->customer_name }}</div>
            <div class="text-gray-700">{{ $order->customer_email }}</div>
        </div>

        <div class="bg-white p-6 shadow-xs sm:rounded-lg space-y-1 text-sm">
            <div class="text-gray-500">{{ __('Placed') }}</div>
            <div class="text-gray-900">{{ $order->created_at->format('Y-m-d H:i') }} UTC</div>
            <div class="text-gray-500">{{ __('Last change: :time', ['time' => $order->updated_at->format('Y-m-d H:i')]) }}</div>
        </div>

        <div class="bg-white p-6 shadow-xs sm:rounded-lg space-y-3 text-sm">
            <div class="flex items-center justify-between">
                <span class="text-gray-500">{{ __('Status') }}</span>
                <x-order-status :status="$order->status" />
            </div>

            {{-- Only the moves the order can make next. The API gateway checks them again. --}}
            <div class="flex flex-wrap gap-2">
                @forelse ($order->status->nextStatuses() as $next)
                    <form method="POST" action="{{ route('admin.orders.status', $order->id) }}"
                          @if ($next === OrderStatus::Cancelled) onsubmit="return confirm('{{ __('Cancel this order? Its items go back into stock.') }}')" @endif>
                        @csrf
                        @method('PATCH')
                        <input type="hidden" name="status" value="{{ $next->value }}">
                        @if ($next === OrderStatus::Cancelled)
                            <x-danger-button>{{ __($next->actionLabel()) }}</x-danger-button>
                        @else
                            <x-primary-button>{{ __($next->actionLabel()) }}</x-primary-button>
                        @endif
                    </form>
                @empty
                    <p class="text-gray-500">{{ __('This order is final.') }}</p>
                @endforelse
            </div>
            <x-input-error :messages="$errors->get('status')" />
        </div>
    </div>

    <div class="bg-white shadow-xs sm:rounded-lg overflow-x-auto">
        <table class="min-w-full divide-y divide-gray-200 text-sm">
            <thead class="bg-gray-50 text-left text-gray-600">
                <tr>
                    <th class="px-4 py-3 font-medium">{{ __('Product') }}</th>
                    <th class="px-4 py-3 font-medium text-right">{{ __('Price') }}</th>
                    <th class="px-4 py-3 font-medium text-right">{{ __('Quantity') }}</th>
                    <th class="px-4 py-3 font-medium text-right">{{ __('Total') }}</th>
                </tr>
            </thead>
            <tbody class="divide-y divide-gray-100">
                @foreach ($order->items as $item)
                    <tr>
                        <td class="px-4 py-3 text-gray-900">{{ $item->product_name }}</td>
                        <td class="px-4 py-3 text-right text-gray-700">{{ Money::format($item->unit_price_cents) }}</td>
                        <td class="px-4 py-3 text-right text-gray-700">{{ $item->quantity }}</td>
                        <td class="px-4 py-3 text-right text-gray-900">{{ Money::format($item->totalCents()) }}</td>
                    </tr>
                @endforeach
            </tbody>
            <tfoot class="bg-gray-50">
                <tr>
                    <td colspan="3" class="px-4 py-3 text-right font-medium text-gray-700">{{ __('Order total') }}</td>
                    <td class="px-4 py-3 text-right font-semibold text-gray-900">{{ Money::format($order->total_cents) }}</td>
                </tr>
            </tfoot>
        </table>
    </div>
</x-app-layout>
