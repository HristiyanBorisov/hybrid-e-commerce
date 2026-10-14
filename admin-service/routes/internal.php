<?php

use App\Http\Controllers\Internal\ProductController;
use App\Http\Controllers\Internal\SyncController;
use Illuminate\Support\Facades\Route;

/*
| The internal API: /internal/v1/… (prefix and middleware set in bootstrap/app.php).
| Only reachable from the Docker network (nginx port 8081), and every call needs the X-Api-Key header.
*/

Route::name('internal.')->group(function () {
    Route::post('products', [ProductController::class, 'store'])->name('products.store');
    Route::put('products/{product}', [ProductController::class, 'update'])->whereUuid('product')->name('products.update');

    // What this service copies from the gateway
    Route::put('sync/orders/{orderId}', [SyncController::class, 'order'])->whereUuid('orderId')->name('sync.orders');
    Route::put('sync/stock-levels/{productId}', [SyncController::class, 'stockLevel'])->whereUuid('productId')->name('sync.stock-levels');
});
