<?php

namespace App\Http\Controllers\Admin;

use App\Actions\Categories\ListCategoryTreeAction;
use App\Actions\Dashboard\BuildDashboardMetricsAction;
use App\Actions\Products\CreateProductAction;
use App\Actions\Products\DeleteProductAction;
use App\Actions\Products\ExportProductsAction;
use App\Actions\Products\ListProductsAction;
use App\Actions\Products\RestoreProductAction;
use App\Actions\Products\UpdateProductAction;
use App\Enums\TrashedFilter;
use App\Http\Controllers\Controller;
use App\Http\Requests\Products\ListProductsRequest;
use App\Http\Requests\Products\StoreProductRequest;
use App\Http\Requests\Products\UpdateProductRequest;
use App\Models\Product;
use Illuminate\Http\RedirectResponse;
use Illuminate\View\View;
use Symfony\Component\HttpFoundation\StreamedResponse;

final class ProductController extends Controller
{
    public function index(ListProductsRequest $request, ListProductsAction $listProducts, ListCategoryTreeAction $listTree): View
    {
        $filter = $request->toDto();

        return view('admin.products.index', [
            'products' => $listProducts->execute($filter),
            'filter' => $filter,
            'categories' => $listTree->execute(),
            'trashedFilters' => TrashedFilter::cases(),
            'lowStock' => BuildDashboardMetricsAction::LOW_STOCK,
        ]);
    }

    public function create(ListCategoryTreeAction $listTree): View
    {
        return view('admin.products.create', ['categories' => $listTree->execute()]);
    }

    public function store(StoreProductRequest $request, CreateProductAction $createProduct): RedirectResponse
    {
        $product = $createProduct->execute($request->toDto());

        return redirect()
            ->route('admin.products.index')
            ->with('status', __('Product ":name" created.', ['name' => $product->name]));
    }

    public function edit(Product $product, ListCategoryTreeAction $listTree): View
    {
        return view('admin.products.edit', ['product' => $product, 'categories' => $listTree->execute()]);
    }

    public function update(UpdateProductRequest $request, Product $product, UpdateProductAction $updateProduct): RedirectResponse
    {
        $updateProduct->execute($product, $request->toDto());

        return redirect()
            ->route('admin.products.index')
            ->with('status', __('Product ":name" updated.', ['name' => $product->name]));
    }

    public function destroy(Product $product, DeleteProductAction $deleteProduct): RedirectResponse
    {
        $deleteProduct->execute($product);

        return back()->with('status', __('Product ":name" moved to the trash.', ['name' => $product->name]));
    }

    public function restore(Product $product, RestoreProductAction $restoreProduct): RedirectResponse
    {
        $restoreProduct->execute($product);

        return back()->with('status', __('Product ":name" restored.', ['name' => $product->name]));
    }

    /** Streams the CSV row by row: the whole file is never held in memory. */
    public function export(ExportProductsAction $exportProducts): StreamedResponse
    {
        return response()->streamDownload(function () use ($exportProducts): void {
            $output = fopen('php://output', 'w');

            foreach ($exportProducts->execute() as $row) {
                fputcsv($output, $row, ',', '"', '');
            }

            fclose($output);
        }, 'products-'.now()->format('Y-m-d').'.csv', ['Content-Type' => 'text/csv']);
    }
}
