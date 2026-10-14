<?php

namespace Tests\Unit\Auth;

use App\Auth\AccessTokenCookie;
use App\Dto\Auth\AccessTokenDto;
use Tests\TestCase;

final class AccessTokenCookieTest extends TestCase
{
    public function test_it_creates_the_shared_login_cookie_with_the_same_flags_as_the_gateway(): void
    {
        $cookie = (new AccessTokenCookie)->make(new AccessTokenDto('the-token', 3600));

        $this->assertSame('access_token', $cookie->getName());
        $this->assertSame('the-token', $cookie->getValue());
        $this->assertSame('/', $cookie->getPath());
        $this->assertSame(3600, $cookie->getMaxAge());
        $this->assertTrue($cookie->isHttpOnly());
        $this->assertSame('lax', $cookie->getSameSite());
        $this->assertFalse($cookie->isSecure());
    }

    public function test_it_is_https_only_when_configured(): void
    {
        config(['gateway.cookie.secure' => true]);

        $this->assertTrue((new AccessTokenCookie)->make(new AccessTokenDto('the-token', 3600))->isSecure());
    }

    public function test_it_clears_the_cookie(): void
    {
        $cookie = (new AccessTokenCookie)->forget();

        $this->assertSame('access_token', $cookie->getName());
        $this->assertTrue($cookie->isCleared());
    }
}
