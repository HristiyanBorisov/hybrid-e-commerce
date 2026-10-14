<?php

namespace Tests\Support;

use App\Enums\UserRole;
use Firebase\JWT\JWT;
use RuntimeException;

/**
 * Signs login tokens the way the API gateway does, with an RSA key pair made just for the tests —
 * so the tests don't need `make keys`.
 */
final class TestTokens
{
    public const ADMIN_ID = '0199e3a0-0000-7000-8000-00000000000a';

    public const CUSTOMER_ID = '0199e3a0-0000-7000-8000-00000000000c';

    private static ?string $privateKey = null;

    private static ?string $publicKeyPath = null;

    public static function publicKeyPath(): string
    {
        self::createKeysOnce();

        return self::$publicKeyPath;
    }

    /** @param array<string, mixed> $claims overrides */
    public static function admin(array $claims = []): string
    {
        return self::sign([
            'sub' => self::ADMIN_ID,
            'email' => 'admin@example.com',
            'name' => 'Test Admin',
            'role' => UserRole::Admin->value,
            ...$claims,
        ]);
    }

    /** @param array<string, mixed> $claims overrides */
    public static function customer(array $claims = []): string
    {
        return self::sign([
            'sub' => self::CUSTOMER_ID,
            'email' => 'alice@example.com',
            'name' => 'Alice Customer',
            'role' => UserRole::Customer->value,
            ...$claims,
        ]);
    }

    public static function expiredAdmin(): string
    {
        return self::admin(['iat' => time() - 7200, 'exp' => time() - 3600]);
    }

    /** A correct-looking admin token, signed with someone else's private key. */
    public static function forgedAdmin(): string
    {
        return JWT::encode(self::claims(['sub' => self::ADMIN_ID, 'email' => 'admin@example.com', 'name' => 'Forger', 'role' => 'admin']), self::newKeyPair()['private'], 'RS256');
    }

    /** @param array<string, mixed> $claims */
    public static function sign(array $claims): string
    {
        self::createKeysOnce();

        return JWT::encode(self::claims($claims), self::$privateKey, 'RS256');
    }

    /**
     * @param  array<string, mixed>  $claims
     * @return array<string, mixed>
     */
    private static function claims(array $claims): array
    {
        return ['iss' => 'api-gateway', 'iat' => time(), 'exp' => time() + 3600, ...$claims];
    }

    private static function createKeysOnce(): void
    {
        if (self::$privateKey !== null) {
            return;
        }

        $keys = self::newKeyPair();
        self::$privateKey = $keys['private'];
        self::$publicKeyPath = tempnam(sys_get_temp_dir(), 'jwt-public-');
        file_put_contents(self::$publicKeyPath, $keys['public']);
    }

    /** @return array{private: string, public: string} */
    private static function newKeyPair(): array
    {
        $key = openssl_pkey_new(['private_key_bits' => 2048, 'private_key_type' => OPENSSL_KEYTYPE_RSA])
            ?: throw new RuntimeException('Could not create a test RSA key.');

        openssl_pkey_export($key, $privateKey);

        return ['private' => $privateKey, 'public' => openssl_pkey_get_details($key)['key']];
    }
}
