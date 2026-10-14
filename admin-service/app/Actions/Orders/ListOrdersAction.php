<?php

namespace App\Actions\Orders;

use App\Dto\Orders\OrderFilterDto;
use App\Models\Order;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Builder;

/** One page of orders, newest first, from this service's copy of the orders. */
final class ListOrdersAction
{
    /** @return LengthAwarePaginator<int, Order> */
    public function execute(OrderFilterDto $filter): LengthAwarePaginator
    {
        return Order::query()
            ->withSum('items as units', 'quantity')
            ->when($filter->status, fn (Builder $query, $status) => $query->where('status', $status))
            ->when($filter->search, fn (Builder $query, string $search) => $query->where(
                fn (Builder $query) => $query->whereLike('customer_name', "%{$search}%")->orWhereLike('customer_email', "%{$search}%"),
            ))
            ->when($filter->from, fn (Builder $query, $from) => $query->where('created_at', '>=', $from->startOfDay()))
            ->when($filter->to, fn (Builder $query, $to) => $query->where('created_at', '<', $to->addDay()->startOfDay()))
            ->orderByDesc('created_at')
            ->orderByDesc('id')
            ->paginate(OrderFilterDto::PER_PAGE)
            ->withQueryString();
    }
}
