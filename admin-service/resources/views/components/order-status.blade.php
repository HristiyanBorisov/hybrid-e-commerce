@use('App\Enums\OrderStatus')
@props(['status'])

<span @class([
    'rounded-full px-2 py-0.5 text-xs font-medium',
    'bg-gray-100 text-gray-700' => $status === OrderStatus::Pending,
    'bg-blue-100 text-blue-800' => $status === OrderStatus::Paid,
    'bg-indigo-100 text-indigo-800' => $status === OrderStatus::Shipped,
    'bg-green-100 text-green-800' => $status === OrderStatus::Delivered,
    'bg-red-100 text-red-800' => $status === OrderStatus::Cancelled,
])>{{ $status->label() }}</span>
