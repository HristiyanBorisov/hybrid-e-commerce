<?php

namespace App\Auth;

use App\Enums\UserRole;
use DomainException;
use Firebase\JWT\JWT;
use Firebase\JWT\Key;
use InvalidArgumentException;
use RuntimeException;
use UnexpectedValueException;

/**
 * Checks a login token issued by the API gateway: RS256 signature (public key), expiry and issuer.
 * No database and no HTTP call — the signature proves the gateway issued it.
 */
final readonly class AccessTokenVerifier
{
    /** The only accepted algorithm, so a token can't trick the check into using another one */
    private const ALGORITHM = 'RS256';

    public function __construct(
        private string $publicKey,
        private string $issuer,
    ) {}

    public static function fromKeyFile(string $path, string $issuer): self
    {
        $publicKey = is_readable($path) ? file_get_contents($path) : false;

        if ($publicKey === false) {
            throw new RuntimeException("JWT public key not found at \"{$path}\". Run `make keys` to create the key pair.");
        }

        return new self($publicKey, $issuer);
    }

    /** @throws InvalidAccessTokenException */
    public function verify(string $token): GatewayUser
    {
        try {
            $claims = JWT::decode($token, new Key($this->publicKey, self::ALGORITHM));
        } catch (UnexpectedValueException|DomainException|InvalidArgumentException $exception) {
            // Expired, wrong signature, malformed …
            throw new InvalidAccessTokenException('The login token is not valid.', previous: $exception);
        }

        if (($claims->iss ?? null) !== $this->issuer) {
            throw new InvalidAccessTokenException('The login token was not issued by the API gateway.');
        }

        $role = is_string($claims->role ?? null) ? UserRole::tryFrom($claims->role) : null;

        if ($role === null || ! isset($claims->sub, $claims->email, $claims->name)) {
            throw new InvalidAccessTokenException('The login token is missing user details.');
        }

        return new GatewayUser(
            id: $claims->sub,
            name: $claims->name,
            email: $claims->email,
            role: $role,
        );
    }
}
