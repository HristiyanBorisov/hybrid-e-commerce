<?php

namespace Tests;

use App\Auth\AccessTokenCookie;
use App\Jobs\SyncCategoryToGateway;
use App\Jobs\SyncProductToGateway;
use Illuminate\Foundation\Testing\TestCase as BaseTestCase;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Queue;
use Tests\Support\TestTokens;

abstract class TestCase extends BaseTestCase
{
    /**
     * When a test refreshes the database, also drop the PostgreSQL enum types (e.g. order_status):
     * Laravel drops only tables by default, and the migrations would fail to create the types again.
     */
    protected bool $dropTypes = true;

    protected function setUp(): void
    {
        parent::setUp();

        // Tokens are checked with the tests' own public key (see TestTokens)
        config(['gateway.jwt.public_key_path' => TestTokens::publicKeyPath()]);

        // Every call to the API gateway must be faked with Http::fake() — a real call fails the test
        Http::preventStrayRequests();

        // Catalog changes queue a sync to the gateway: only recorded here (Queue::assertPushed), never sent.
        // Other jobs (thumbnails, imports) really run — the test queue is synchronous.
        Queue::fake([SyncCategoryToGateway::class, SyncProductToGateway::class]);
    }

    /** Sends the shared login cookie of an admin, like a browser after logging in. */
    protected function actingAsAdmin(): static
    {
        return $this->withUnencryptedCookie(AccessTokenCookie::NAME, TestTokens::admin());
    }

    /** Sends the shared login cookie of a customer (who logged in through the API). */
    protected function actingAsCustomer(): static
    {
        return $this->withUnencryptedCookie(AccessTokenCookie::NAME, TestTokens::customer());
    }

    /** The gateway URL a faked request goes to, e.g. gatewayUrl('users*'). */
    protected function gatewayUrl(string $path): string
    {
        return rtrim(config('gateway.url'), '/').'/'.$path;
    }
}
