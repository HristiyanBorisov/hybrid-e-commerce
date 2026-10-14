<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * COPY of gateway_db.order_items. Items arrive in the same sync message as their order,
 * so the foreign key to orders is safe. product_id has no foreign key: it's copied data.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('order_items', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('order_id')->index()->constrained()->cascadeOnDelete();
            $table->uuid('product_id')->index();
            $table->string('product_name');
            $table->integer('unit_price_cents');
            $table->integer('quantity');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('order_items');
    }
};
