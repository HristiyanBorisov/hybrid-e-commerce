<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * COPY of gateway_db.orders — written only by the sync from the API gateway, which owns orders.
 * No foreign keys or CHECK constraints: the owner already validated the data.
 * The customer's name and email are copied at order time (users live in gateway_db).
 */
return new class extends Migration
{
    public function up(): void
    {
        // A real PostgreSQL enum type — $table->enum() would create a varchar with a CHECK instead
        DB::statement("CREATE TYPE order_status AS ENUM ('pending', 'paid', 'shipped', 'delivered', 'cancelled')");

        Schema::create('orders', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('customer_id');
            $table->string('customer_name');
            $table->string('customer_email');
            $table->rawColumn('status', 'order_status');
            $table->integer('total_cents');
            $table->integer('version');
            $table->timestampsTz();

            $table->index(['status', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('orders');
        DB::statement('DROP TYPE IF EXISTS order_status');
    }
};
