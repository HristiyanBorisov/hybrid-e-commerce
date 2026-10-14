<?php

namespace Tests\Feature\Catalog;

use App\Jobs\SyncCategoryToGateway;
use App\Jobs\SyncProductToGateway;
use App\Models\Category;
use App\Models\Product;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Client\Request as ClientRequest;
use Illuminate\Http\Client\RequestException;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Queue;
use RuntimeException;
use Tests\TestCase;

/** Every catalog change is sent to the API gateway (which keeps a copy) by a queued job. */
final class SyncTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        config(['gateway.internal_url' => 'http://api-gateway.test/internal/v1', 'gateway.api_key' => 'test-key']);
    }

    public function test_a_category_is_sent_as_it_is_now_with_the_api_key(): void
    {
        Http::fake(['api-gateway.test/*' => Http::response(null, 204)]);
        $parent = Category::factory()->create();
        $category = Category::factory()->childOf($parent)->create(['name' => 'Phones']);

        $this->app->call([new SyncCategoryToGateway($category->id), 'handle']);

        Http::assertSent(fn (ClientRequest $request) => $request->method() === 'PUT'
            && $request->url() === "http://api-gateway.test/internal/v1/sync/categories/{$category->id}"
            && $request->hasHeader('X-Api-Key', 'test-key')
            && $request->data() === ['id' => $category->id, 'parentId' => $parent->id, 'name' => 'Phones', 'slug' => 'phones', 'version' => 1]);
    }

    public function test_a_deleted_category_is_deleted_in_the_gateway_too(): void
    {
        Http::fake(['api-gateway.test/*' => Http::response(null, 204)]);

        $this->app->call([new SyncCategoryToGateway('0199e3a0-0000-7000-8000-000000000001'), 'handle']);

        Http::assertSent(fn (ClientRequest $request) => $request->method() === 'DELETE'
            && str_ends_with($request->url(), '/sync/categories/0199e3a0-0000-7000-8000-000000000001'));
    }

    public function test_a_soft_deleted_product_is_sent_with_deleted_at(): void
    {
        Http::fake(['api-gateway.test/*' => Http::response(null, 204)]);
        $product = Product::factory()->create(['sku' => 'LMP-1']);
        $product->delete();

        $this->app->call([new SyncProductToGateway($product->id), 'handle']);

        Http::assertSent(fn (ClientRequest $request) => $request->method() === 'PUT'
            && str_ends_with($request->url(), "/sync/products/{$product->id}")
            && $request['sku'] === 'LMP-1'
            && $request['version'] === 2
            && $request['deletedAt'] !== null);
    }

    public function test_a_product_that_no_longer_exists_is_deleted_in_the_gateway(): void
    {
        Http::fake(['api-gateway.test/*' => Http::response(null, 204)]);

        $this->app->call([new SyncProductToGateway('0199e3a0-0000-7000-8000-000000000002'), 'handle']);

        Http::assertSent(fn (ClientRequest $request) => $request->method() === 'DELETE');
    }

    public function test_a_failed_call_throws_so_the_job_is_retried(): void
    {
        Http::fake(['api-gateway.test/*' => Http::response(['message' => 'down'], 503)]);
        $product = Product::factory()->create();

        $this->expectException(RequestException::class);

        $this->app->call([new SyncProductToGateway($product->id), 'handle']);
    }

    public function test_jobs_retry_with_growing_pauses(): void
    {
        $job = new SyncProductToGateway('x');

        $this->assertSame(5, $job->tries);
        $this->assertSame([10, 30, 60, 120], $job->backoff);
    }

    public function test_nothing_is_sent_for_changes_that_were_rolled_back(): void
    {
        try {
            DB::transaction(function (): void {
                Category::factory()->create();

                throw new RuntimeException('Something went wrong');
            });
        } catch (RuntimeException) {
            // expected
        }

        Queue::assertNotPushed(SyncCategoryToGateway::class);
    }

    public function test_resync_queues_every_category_and_product_including_trashed_ones(): void
    {
        $category = Category::factory()->create();
        Product::factory()->for($category)->count(2)->create();
        Product::factory()->for($category)->create()->delete();
        Queue::fake([SyncCategoryToGateway::class, SyncProductToGateway::class]); // forget the jobs queued while creating them

        $this->artisan('catalog:resync')
            ->expectsOutput('Queued for the API gateway — categories: 1, products: 3.')
            ->assertSuccessful();

        Queue::assertPushed(SyncCategoryToGateway::class, 1);
        Queue::assertPushed(SyncProductToGateway::class, 3);
    }

    public function test_resync_now_sends_everything_right_away_instead_of_queueing_it(): void
    {
        Product::factory()->create();
        Queue::fake([SyncCategoryToGateway::class, SyncProductToGateway::class]); // forget the jobs queued while creating it

        $this->artisan('catalog:resync --now')
            ->expectsOutput('Sent to the API gateway — categories: 1, products: 1.')
            ->assertSuccessful();

        // The "sync" connection runs a job straight away, in this process — not later, by the queue worker
        Queue::assertPushed(SyncCategoryToGateway::class, fn (SyncCategoryToGateway $job) => $job->connection === 'sync');
        Queue::assertPushed(SyncProductToGateway::class, fn (SyncProductToGateway $job) => $job->connection === 'sync');
    }
}
