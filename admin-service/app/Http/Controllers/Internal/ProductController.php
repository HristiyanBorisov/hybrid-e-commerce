<?php

namespace App\Http\Controllers\Internal;

use App\Actions\Products\CreateProductAction;
use App\Actions\Products\UpdateProductAction;
use App\Http\Controllers\Controller;
use App\Http\Requests\Internal\StoreProductRequest;
use App\Http\Requests\Internal\UpdateProductRequest;
use App\Http\Resources\ProductResource;
use App\Models\Product;
use Illuminate\Http\JsonResponse;

/**
 * The internal product API (/internal/v1/products), called by the API gateway: its POST/PUT /api/v1/products
 * are forwarded here, because this service owns the catalog. Same Actions as the admin forms.
 */
final class ProductController extends Controller
{
    public function store(StoreProductRequest $request, CreateProductAction $createProduct): JsonResponse
    {
        return ProductResource::make($createProduct->execute($request->toDto()))
            ->response()
            ->setStatusCode(201);
    }

    public function update(UpdateProductRequest $request, Product $product, UpdateProductAction $updateProduct): ProductResource
    {
        return ProductResource::make($updateProduct->execute($product, $request->toDto()));
    }
}
