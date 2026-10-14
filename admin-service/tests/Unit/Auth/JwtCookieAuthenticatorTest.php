<?php

namespace Tests\Unit\Auth;

use App\Auth\AccessTokenVerifier;
use App\Auth\JwtCookieAuthenticator;
use Illuminate\Http\Request;
use PHPUnit\Framework\TestCase;
use Tests\Support\TestTokens;

final class JwtCookieAuthenticatorTest extends TestCase
{
    private JwtCookieAuthenticator $authenticator;

    protected function setUp(): void
    {
        $this->authenticator = new JwtCookieAuthenticator(
            AccessTokenVerifier::fromKeyFile(TestTokens::publicKeyPath(), 'api-gateway'),
        );
    }

    public function test_a_valid_cookie_logs_the_user_in(): void
    {
        $user = ($this->authenticator)($this->requestWithCookie(TestTokens::admin()));

        $this->assertSame(TestTokens::ADMIN_ID, $user?->id);
    }

    public function test_no_cookie_means_not_logged_in(): void
    {
        $this->assertNull(($this->authenticator)(Request::create('/admin')));
        $this->assertNull(($this->authenticator)($this->requestWithCookie('')));
    }

    public function test_an_invalid_token_means_not_logged_in(): void
    {
        $this->assertNull(($this->authenticator)($this->requestWithCookie(TestTokens::expiredAdmin())));
        $this->assertNull(($this->authenticator)($this->requestWithCookie(TestTokens::forgedAdmin())));
    }

    private function requestWithCookie(string $token): Request
    {
        return Request::create('/admin', cookies: ['access_token' => $token]);
    }
}
