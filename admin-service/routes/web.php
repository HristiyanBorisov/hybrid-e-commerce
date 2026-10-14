<?php

use App\Http\Controllers\Admin\CategoryController;
use App\Http\Controllers\Admin\DashboardController;
use App\Http\Controllers\Admin\OrderController;
use App\Http\Controllers\Admin\ProductController;
use App\Http\Controllers\Admin\ProductImportController;
use App\Http\Controllers\Admin\SalesReportController;
use App\Http\Controllers\Admin\StockAdjustmentController;
use App\Http\Controllers\Admin\UserController;
use App\Http\Controllers\Auth\LoginController;
use Illuminate\Support\Facades\Route;

Route::redirect('/', '/admin');

Route::prefix('admin')->name('admin.')->group(function () {
    // No "guest" middleware: customers carry the shared cookie too, and must still be able to log in as an admin
    Route::get('login', [LoginController::class, 'create'])->name('login');
    Route::post('login', [LoginController::class, 'store'])->name('login.store');

    Route::post('logout', [LoginController::class, 'destroy'])->middleware('auth')->name('logout');

    Route::middleware(['auth', 'admin'])->group(function () {
        Route::get('/', DashboardController::class)->name('dashboard');

        Route::resource('users', UserController::class)->except('show')->whereUuid('user');

        Route::resource('categories', CategoryController::class)->except('show')->whereUuid('category');

        Route::get('products/export', [ProductController::class, 'export'])->name('products.export');
        // Restoring needs the soft-deleted product, which route model binding skips by default
        Route::post('products/{product}/restore', [ProductController::class, 'restore'])
            ->withTrashed()->whereUuid('product')->name('products.restore');
        Route::resource('products', ProductController::class)->except('show')->whereUuid('product');

        Route::post('products/{product}/stock-adjustments', [StockAdjustmentController::class, 'store'])
            ->whereUuid('product')->name('products.stock-adjustments.store');

        Route::get('imports', [ProductImportController::class, 'index'])->name('imports.index');
        Route::post('imports', [ProductImportController::class, 'store'])->name('imports.store');

        Route::get('orders', [OrderController::class, 'index'])->name('orders.index');
        Route::get('orders/{order}', [OrderController::class, 'show'])->whereUuid('order')->name('orders.show');
        Route::patch('orders/{order}/status', [OrderController::class, 'updateStatus'])->whereUuid('order')->name('orders.status');

        Route::get('reports/sales', [SalesReportController::class, 'index'])->name('reports.sales');
        Route::get('reports/sales/csv', [SalesReportController::class, 'csv'])->name('reports.sales.csv');
        Route::get('reports/sales/pdf', [SalesReportController::class, 'pdf'])->name('reports.sales.pdf');
    });
});
