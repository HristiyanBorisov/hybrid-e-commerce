<?php

namespace Tests\Unit\Auth;

use App\Auth\AccessTokenVerifier;
use App\Auth\InvalidAccessTokenException;
use App\Enums\UserRole;
use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\TestCase;
use RuntimeException;
use Tests\Support\TestTokens;

final class AccessTokenVerifierTest extends TestCase
{
    private AccessTokenVerifier $verifier;

    protected function setUp(): void
    {
        $this->verifier = AccessTokenVerifier::fromKeyFile(TestTokens::publicKeyPath(), 'api-gateway');
    }

    public function test_it_turns_a_valid_token_into_the_logged_in_user(): void
    {
        $user = $this->verifier->verify(TestTokens::admin());

        $this->assertSame(TestTokens::ADMIN_ID, $user->id);
        $this->assertSame('admin@example.com', $user->email);
        $this->assertSame('Test Admin', $user->name);
        $this->assertSame(UserRole::Admin, $user->role);
    }

    /** @return array<string, array{0: string}> */
    public static function invalidTokens(): array
    {
        return [
            'expired' => [TestTokens::expiredAdmin()],
            'signed with another key' => [TestTokens::forgedAdmin()],
            'from another issuer' => [TestTokens::admin(['iss' => 'someone-else'])],
            'unknown role' => [TestTokens::admin(['role' => 'owner'])],
            'no user id' => [TestTokens::sign(['email' => 'a@example.com', 'name' => 'A', 'role' => 'admin'])],
            'not a token at all' => ['not.a.token'],
        ];
    }

    #[DataProvider('invalidTokens')]
    public function test_it_rejects_invalid_tokens(string $token): void
    {
        $this->expectException(InvalidAccessTokenException::class);

        $this->verifier->verify($token);
    }

    public function test_it_explains_how_to_create_a_missing_key(): void
    {
        $this->expectException(RuntimeException::class);
        $this->expectExceptionMessage('JWT public key not found at "/nowhere/jwt-public.pem". Run `make keys`');

        AccessTokenVerifier::fromKeyFile('/nowhere/jwt-public.pem', 'api-gateway');
    }
}
