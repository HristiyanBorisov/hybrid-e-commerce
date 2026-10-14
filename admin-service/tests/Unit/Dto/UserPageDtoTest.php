<?php

namespace Tests\Unit\Dto;

use App\Dto\Auth\AccessTokenDto;
use App\Dto\Users\UserPageDto;
use App\Enums\UserRole;
use PHPUnit\Framework\TestCase;

final class UserPageDtoTest extends TestCase
{
    public function test_it_reads_the_gateways_list_response_into_typed_objects(): void
    {
        $page = UserPageDto::fromArray([
            'data' => [[
                'id' => '0199e3a0-0000-7000-8000-000000000001',
                'name' => 'Alice',
                'email' => 'alice@example.com',
                'role' => 'customer',
                'createdAt' => '2026-10-11T12:09:14.042Z',
            ]],
            'meta' => ['page' => 2, 'limit' => 20, 'total' => 21, 'totalPages' => 2],
        ]);

        $this->assertSame([2, 20, 21], [$page->page, $page->limit, $page->total]);
        $this->assertSame('alice@example.com', $page->users[0]->email);
        $this->assertSame(UserRole::Customer, $page->users[0]->role);
        $this->assertSame('2026-10-11 12:09', $page->users[0]->createdAt->format('Y-m-d H:i'));
    }

    public function test_it_reads_the_gateways_login_response(): void
    {
        $token = AccessTokenDto::fromArray(['accessToken' => 'abc', 'tokenType' => 'Bearer', 'expiresIn' => 3600]);

        $this->assertSame(['abc', 3600], [$token->accessToken, $token->expiresIn]);
    }

    public function test_roles_have_a_readable_label(): void
    {
        $this->assertSame('Admin', UserRole::Admin->label());
    }
}
