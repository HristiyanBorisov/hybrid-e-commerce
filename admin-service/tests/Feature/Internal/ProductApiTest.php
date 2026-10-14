<?php

namespace Tests\Feature\Internal;

use App\Models\Category;
use App\Models\Product;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Testing\TestResponse;
use Tests\TestCase;

/** The internal API the API gateway forwards product writes to (/internal/v1/products). */
final class ProductApiTest extends TestCase
{
    use RefreshDatabase;

    private const API_KEY = 'test-internal-api-key';

    protected function setUp(): void
    {
        parent::setUp();

        config(['gateway.api_key' => self::API_KEY]);
    }

    public function test_calls_without_the_right_api_key_are_rejected(): void
    {
        $this->postJson('/internal/v1/products', [])->assertUnauthorized()->assertJson(['message' => 'Invalid API key.']);
        $this->postJson('/internal/v1/products', [], ['X-Api-Key' => 'wrong'])->assertUnauthorized();
    }

    public function test_nothing_gets_in_when_no_api_key_is_configured(): void
    {
        config(['gateway.api_key' => null]);

        $this->postJson('/internal/v1/products', [], ['X-Api-Key' => ''])->assertUnauthorized();
    }

    public function test_the_gateway_creates_a_product(): void
    {
        $category = Category::factory()->create();

        $response = $this->callApi('POST', '/internal/v1/products', [
            'categoryId' => $category->id,
            'sku' => 'API-1',
            'name' => 'From The Gateway',
            'priceCents' => 2599,
        ]);

        $product = Product::sole();
        $response->assertCreated()->assertExactJson([
            'id' => $product->id,
            'categoryId' => $category->id,
            'sku' => 'API-1',
            'name' => 'From The Gateway',
            'slug' => 'from-the-gateway',
            'description' => null,
            'priceCents' => 2599,
            'imageUrl' => null,
            'thumbnailUrl' => null,
            'version' => 1,
            'createdAt' => $product->created_at->toIso8601String(),
            'updatedAt' => $product->updated_at->toIso8601String(),
            'deletedAt' => null,
        ]);
    }

    public function test_invalid_input_is_a_422_with_errors_per_field(): void
    {
        Product::factory()->create(['sku' => 'TAKEN']);

        $this->callApi('POST', '/internal/v1/products', ['sku' => 'TAKEN', 'priceCents' => -1])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['categoryId', 'sku', 'name', 'priceCents']);
    }

    public function test_the_gateway_updates_a_product(): void
    {
        $product = Product::factory()->create(['sku' => 'API-1']);

        $this->callApi('PUT', "/internal/v1/products/{$product->id}", [
            'categoryId' => $product->category_id,
            'sku' => 'API-1',
            'name' => 'Renamed',
            'priceCents' => 100,
            'description' => 'New text',
        ])->assertOk()->assertJson(['id' => $product->id, 'name' => 'Renamed', 'priceCents' => 100, 'version' => 2]);
    }

    public function test_an_unknown_product_is_a_404(): void
    {
        $this->callApi('PUT', '/internal/v1/products/0199e3a0-0000-7000-8000-000000000000', [])->assertNotFound();
    }

    /** @param array<string, mixed> $data */
    private function callApi(string $method, string $uri, array $data): TestResponse
    {
        return $this->json($method, $uri, $data, ['X-Api-Key' => self::API_KEY]);
    }
}
