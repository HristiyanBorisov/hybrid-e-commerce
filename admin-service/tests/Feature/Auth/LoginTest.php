<?php

namespace Tests\Feature\Auth;

use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\Client\Request as ClientRequest;
use Illuminate\Support\Facades\Http;
use Tests\Support\TestTokens;
use Tests\TestCase;

final class LoginTest extends TestCase
{
    public function test_the_login_form_is_shown(): void
    {
        $this->get('/admin/login')->assertOk()->assertSee('Log in');
    }

    public function test_an_admin_logs_in_through_the_gateway_and_gets_the_shared_cookie(): void
    {
        $token = TestTokens::admin();
        $this->fakeGatewayLogin(Http::response(['accessToken' => $token, 'tokenType' => 'Bearer', 'expiresIn' => 3600]));

        $response = $this->post('/admin/login', ['email' => ' Admin@Example.com ', 'password' => 'password']);

        $response->assertRedirect('/admin');
        $response->assertPlainCookie('access_token', $token);
        Http::assertSent(fn (ClientRequest $request) => $request['email'] === 'admin@example.com' && $request['password'] === 'password');
    }

    public function test_a_customer_cannot_log_in_to_the_admin_panel(): void
    {
        $this->fakeGatewayLogin(Http::response(['accessToken' => TestTokens::customer(), 'tokenType' => 'Bearer', 'expiresIn' => 3600]));

        $response = $this->from('/admin/login')->post('/admin/login', ['email' => 'alice@example.com', 'password' => 'password']);

        $response->assertRedirect('/admin/login');
        $response->assertSessionHasErrors(['email' => "These credentials don't belong to an admin account."]);
        $response->assertCookieMissing('access_token');
    }

    public function test_wrong_credentials_are_rejected(): void
    {
        $this->fakeGatewayLogin(Http::response(['statusCode' => 401, 'message' => 'Invalid email or password'], 401));

        $this->from('/admin/login')
            ->post('/admin/login', ['email' => 'admin@example.com', 'password' => 'wrong-password'])
            ->assertSessionHasErrors(['email' => __('auth.failed')])
            ->assertCookieMissing('access_token');
    }

    public function test_invalid_input_never_reaches_the_gateway(): void
    {
        $this->post('/admin/login', ['email' => 'not-an-email', 'password' => ''])
            ->assertSessionHasErrors(['email', 'password']);

        Http::assertNothingSent();
    }

    public function test_after_five_failed_attempts_the_login_is_locked_for_a_while(): void
    {
        $this->freezeTime();
        $this->fakeGatewayLogin(Http::response(['statusCode' => 401, 'message' => 'Invalid email or password'], 401));

        foreach (range(1, 5) as $attempt) {
            $this->post('/admin/login', ['email' => 'admin@example.com', 'password' => "wrong-{$attempt}"]);
        }

        $this->post('/admin/login', ['email' => 'admin@example.com', 'password' => 'password'])
            ->assertSessionHasErrors(['email' => __('auth.throttle', ['seconds' => 60, 'minutes' => 1])]);
        Http::assertSentCount(5);
    }

    public function test_the_admin_sees_a_friendly_page_when_the_gateway_is_down(): void
    {
        Http::fake(fn () => throw new ConnectionException('Connection refused'));

        $this->post('/admin/login', ['email' => 'admin@example.com', 'password' => 'password'])
            ->assertStatus(503)
            ->assertSee('Service unavailable');
    }

    public function test_a_logged_in_admin_goes_straight_to_the_dashboard(): void
    {
        $this->actingAsAdmin()->get('/admin/login')->assertRedirect('/admin');
    }

    public function test_a_customer_with_the_shared_cookie_still_sees_the_login_form(): void
    {
        $this->actingAsCustomer()->get('/admin/login')->assertOk()->assertSee('Log in');
    }

    public function test_logging_out_clears_the_shared_cookie(): void
    {
        $this->actingAsAdmin()
            ->post('/admin/logout')
            ->assertRedirect('/admin/login')
            ->assertCookieExpired('access_token');
    }

    private function fakeGatewayLogin(mixed $response): void
    {
        Http::fake([$this->gatewayUrl('auth/login') => $response]);
    }
}
