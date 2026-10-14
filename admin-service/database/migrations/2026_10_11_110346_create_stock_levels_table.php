<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * COPY of gateway_db.stock_levels — the API gateway owns stock, so the admin panel only reads it.
 * No foreign key to products: stock messages can arrive in any order.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('stock_levels', function (Blueprint $table) {
            $table->uuid('product_id')->primary();
            $table->integer('quantity');
            $table->integer('version');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('stock_levels');
    }
};
