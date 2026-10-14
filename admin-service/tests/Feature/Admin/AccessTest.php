<?php

namespace Tests\Feature\Admin;

use App\Auth\AccessTokenCookie;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Support\TestTokens;
use Tests\TestCase;

final class AccessTest extends TestCase
{
    // The dashboard reads orders and stock — the tables must exist even when this test runs first
    use RefreshDatabase;

    public function test_the_root_url_opens_the_admin_panel(): void
    {
        $this->get('/')->assertRedirect('/admin');
    }

    public function test_guests_are_sent_to_the_login_form(): void
    {
        $this->get('/admin')->assertRedirect('/admin/login');
        $this->get('/admin/users')->assertRedirect('/admin/login');
    }

    public function test_expired_and_forged_tokens_count_as_not_logged_in(): void
    {
        $this->withUnencryptedCookie(AccessTokenCookie::NAME, TestTokens::expiredAdmin())
            ->get('/admin')
            ->assertRedirect('/admin/login');

        $this->withUnencryptedCookie(AccessTokenCookie::NAME, TestTokens::forgedAdmin())
            ->get('/admin')
            ->assertRedirect('/admin/login');
    }

    public function test_customers_with_the_shared_cookie_are_kept_out(): void
    {
        $this->actingAsCustomer()->get('/admin')->assertForbidden();
        $this->actingAsCustomer()->get('/admin/users')->assertForbidden();
    }

    public function test_admins_see_the_dashboard(): void
    {
        $this->actingAsAdmin()
            ->get('/admin')
            ->assertOk()
            ->assertSee('Welcome, Test Admin.')
            ->assertSee('Users');
    }

    public function test_every_response_has_a_request_id(): void
    {
        $generated = $this->get('/admin/login')->headers->get('X-Request-Id');
        $this->assertMatchesRegularExpression('/^[0-9a-f-]{36}$/', (string) $generated);

        $this->get('/admin/login', ['X-Request-Id' => 'trace-123'])->assertHeader('X-Request-Id', 'trace-123');

        $replaced = $this->get('/admin/login', ['X-Request-Id' => "bad id\n"])->headers->get('X-Request-Id');
        $this->assertNotSame("bad id\n", $replaced);
    }
}
