<?php

namespace App\Http\Controllers\Admin;

use App\Actions\Orders\ChangeOrderStatusAction;
use App\Actions\Orders\ListOrdersAction;
use App\Enums\OrderStatus;
use App\Http\Controllers\Controller;
use App\Http\Requests\Orders\ChangeOrderStatusRequest;
use App\Http\Requests\Orders\ListOrdersRequest;
use App\Models\Order;
use Illuminate\Http\RedirectResponse;
use Illuminate\View\View;

/** Orders, read from this service's copy. Status changes go through the API gateway, which owns orders. */
final class OrderController extends Controller
{
    public function index(ListOrdersRequest $request, ListOrdersAction $listOrders): View
    {
        $filter = $request->toDto();

        return view('admin.orders.index', [
            'orders' => $listOrders->execute($filter),
            'filter' => $filter,
            'statuses' => OrderStatus::cases(),
        ]);
    }

    public function show(Order $order): View
    {
        return view('admin.orders.show', ['order' => $order->load('items')]);
    }

    public function updateStatus(ChangeOrderStatusRequest $request, Order $order, ChangeOrderStatusAction $changeStatus): RedirectResponse
    {
        $changeStatus->execute($order, $request->status());

        return redirect()
            ->route('admin.orders.show', $order->id)
            ->with('status', __('Order marked as :status.', ['status' => strtolower($request->status()->label())]));
    }
}
