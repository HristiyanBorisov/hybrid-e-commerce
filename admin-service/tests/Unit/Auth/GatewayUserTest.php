<?php

namespace Tests\Unit\Auth;

use App\Auth\GatewayUser;
use App\Enums\UserRole;
use PHPUnit\Framework\TestCase;

final class GatewayUserTest extends TestCase
{
    public function test_only_admins_are_admins(): void
    {
        $this->assertTrue($this->user(UserRole::Admin)->isAdmin());
        $this->assertFalse($this->user(UserRole::Customer)->isAdmin());
    }

    public function test_it_is_identified_by_the_gateway_user_id(): void
    {
        $user = $this->user(UserRole::Admin);

        $this->assertSame('id', $user->getAuthIdentifierName());
        $this->assertSame('user-1', $user->getAuthIdentifier());
    }

    public function test_it_has_no_password_or_remember_token_here(): void
    {
        $user = $this->user(UserRole::Admin);
        $user->setRememberToken('ignored');

        $this->assertSame('password', $user->getAuthPasswordName());
        $this->assertSame('', $user->getAuthPassword());
        $this->assertNull($user->getRememberToken());
        $this->assertSame('', $user->getRememberTokenName());
    }

    private function user(UserRole $role): GatewayUser
    {
        return new GatewayUser(id: 'user-1', name: 'Eve', email: 'eve@example.com', role: $role);
    }
}
