<?php

namespace App\Http\Controllers\Admin;

use App\Actions\Products\AdjustStockAction;
use App\Http\Controllers\Controller;
use App\Http\Requests\Products\AdjustStockRequest;
use App\Models\Product;
use Illuminate\Http\RedirectResponse;

/** Adding or removing stock by hand. Stock is owned by the API gateway — the change goes through it. */
final class StockAdjustmentController extends Controller
{
    public function store(AdjustStockRequest $request, Product $product, AdjustStockAction $adjustStock): RedirectResponse
    {
        $stockLevel = $adjustStock->execute($product, $request->quantityChange());

        return back()->with('status', __('":name" now has :quantity in stock.', [
            'name' => $product->name,
            'quantity' => $stockLevel->quantity,
        ]));
    }
}
