<?php

namespace App\Http\Controllers\Admin;

use App\Actions\Products\StartProductImportAction;
use App\Http\Controllers\Controller;
use App\Http\Requests\Products\ImportProductsRequest;
use App\Models\ProductImport;
use Illuminate\Http\RedirectResponse;
use Illuminate\View\View;

/** CSV imports: the upload form and the latest imports with their results. */
final class ProductImportController extends Controller
{
    private const SHOWN_IMPORTS = 20;

    public function index(): View
    {
        return view('admin.imports.index', [
            'imports' => ProductImport::query()->latest()->limit(self::SHOWN_IMPORTS)->get(),
        ]);
    }

    public function store(ImportProductsRequest $request, StartProductImportAction $startImport): RedirectResponse
    {
        $import = $startImport->execute($request->csvFile());

        return redirect()
            ->route('admin.imports.index')
            ->with('status', __('":file" is being imported — refresh to see the result.', ['file' => $import->file_name]));
    }
}
