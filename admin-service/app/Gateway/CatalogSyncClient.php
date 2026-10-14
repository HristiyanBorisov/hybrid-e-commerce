<?php

namespace App\Gateway;

use Illuminate\Http\Client\PendingRequest;
use Illuminate\Support\Facades\Http;

/**
 * Sends the catalog to the API gateway's internal API, which keeps a copy of it.
 *
 * Service-to-service: authenticated with the shared API key (no admin is logged in inside a queue job).
 * PUT with the whole current record (or DELETE) — repeating a call changes nothing. A failed call throws,
 * so the queued job retries it.
 */
final class CatalogSyncClient
{
    /** @param array<string, mixed> $category */
    public function putCategory(array $category): void
    {
        $this->http()->put("sync/categories/{$category['id']}", $category)->throw();
    }

    public function deleteCategory(string $id): void
    {
        $this->http()->delete("sync/categories/{$id}")->throw();
    }

    /** @param array<string, mixed> $product */
    public function putProduct(array $product): void
    {
        $this->http()->put("sync/products/{$product['id']}", $product)->throw();
    }

    public function deleteProduct(string $id): void
    {
        $this->http()->delete("sync/products/{$id}")->throw();
    }

    private function http(): PendingRequest
    {
        return Http::baseUrl(config('gateway.internal_url'))
            ->timeout(config('gateway.timeout'))
            ->acceptJson()
            ->withHeaders(['X-Api-Key' => (string) config('gateway.api_key')]);
    }
}
