<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Products are soft-deleted only (never permanently), so ordered products never disappear.
 * Prices are integer cents. The SKU identifies a product during CSV import.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('products', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('category_id')->index()->constrained()->restrictOnDelete();
            $table->string('sku', 64)->unique();
            $table->string('name');
            $table->string('slug')->unique();
            $table->text('description')->nullable();
            $table->integer('price_cents');
            $table->string('image_path')->nullable();
            $table->string('thumbnail_path')->nullable();
            $table->integer('version')->default(1);
            $table->timestampsTz();
            $table->softDeletesTz();
        });

        DB::statement('ALTER TABLE products ADD CONSTRAINT products_price_cents_check CHECK (price_cents >= 0)');
    }

    public function down(): void
    {
        Schema::dropIfExists('products');
    }
};
