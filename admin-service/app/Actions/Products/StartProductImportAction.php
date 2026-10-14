<?php

namespace App\Actions\Products;

use App\Jobs\ImportProductsCsv;
use App\Models\ProductImport;
use Illuminate\Http\UploadedFile;

/** Keeps the uploaded CSV and queues the import, so a big file can't make the request time out. */
final class StartProductImportAction
{
    public function execute(UploadedFile $file): ProductImport
    {
        $import = ProductImport::create([
            'file_name' => $file->getClientOriginalName(),
            // The private "local" disk: uploaded files are never publicly reachable
            'file_path' => $file->store('imports', 'local'),
        ]);

        ImportProductsCsv::dispatch($import->id);

        return $import;
    }
}
