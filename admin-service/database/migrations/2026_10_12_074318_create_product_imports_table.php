<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * One row per CSV product import: its progress and the rows that couldn't be imported.
 * Only the admin panel uses it — it's not synced to the API gateway.
 */
return new class extends Migration
{
    public function up(): void
    {
        DB::statement("CREATE TYPE import_status AS ENUM ('pending', 'processing', 'completed', 'failed')");

        Schema::create('product_imports', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('file_name');
            $table->string('file_path');
            $table->rawColumn('status', "import_status NOT NULL DEFAULT 'pending'");
            $table->integer('total_rows')->default(0);
            $table->integer('imported_rows')->default(0);
            $table->integer('failed_rows')->default(0);
            // [{ "row": 3, "messages": ["The price field must be a number."] }, …]
            $table->jsonb('errors')->nullable();
            $table->timestampsTz();

            $table->index('created_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('product_imports');
        DB::statement('DROP TYPE IF EXISTS import_status');
    }
};
