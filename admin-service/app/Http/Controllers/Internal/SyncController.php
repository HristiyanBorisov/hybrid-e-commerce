<?php

namespace App\Http\Controllers\Internal;

use App\Actions\Sync\SaveOrderCopyAction;
use App\Actions\Sync\SaveStockLevelCopyAction;
use App\Http\Controllers\Controller;
use App\Http\Requests\Internal\SyncOrderRequest;
use App\Http\Requests\Internal\SyncStockLevelRequest;
use Illuminate\Http\Response;

/**
 * Receives what this service copies from the API gateway: orders and stock levels (its sync jobs call these).
 * Every call can be repeated safely: 204 either way.
 */
final class SyncController extends Controller
{
    public function order(SyncOrderRequest $request, SaveOrderCopyAction $saveOrder): Response
    {
        $saveOrder->execute($request->toDto());

        return response()->noContent();
    }

    public function stockLevel(SyncStockLevelRequest $request, SaveStockLevelCopyAction $saveStockLevel): Response
    {
        $saveStockLevel->execute($request->toDto());

        return response()->noContent();
    }
}
