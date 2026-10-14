<?php

namespace App\Jobs;

use App\Actions\Products\ImportProductsAction;
use App\Enums\ImportStatus;
use App\Models\ProductImport;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Throwable;

/** Imports an uploaded product CSV in the queue. Rows are matched by SKU, so a retry imports nothing twice. */
final class ImportProductsCsv implements ShouldQueue
{
    use Queueable;

    public int $tries = 3;

    public function __construct(public readonly string $importId) {}

    public function handle(ImportProductsAction $importProducts): void
    {
        $importProducts->execute(ProductImport::findOrFail($this->importId));
    }

    /** After the last attempt, the import page shows what went wrong. */
    public function failed(Throwable $exception): void
    {
        ProductImport::find($this->importId)?->update([
            'status' => ImportStatus::Failed,
            'errors' => [['row' => 0, 'messages' => [$exception->getMessage()]]],
        ]);
    }
}
