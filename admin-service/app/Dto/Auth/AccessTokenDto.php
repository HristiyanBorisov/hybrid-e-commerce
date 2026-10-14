<?php

namespace App\Dto\Auth;

/** A login token issued by the API gateway. */
final readonly class AccessTokenDto
{
    public function __construct(
        public string $accessToken,
        /** Seconds until the token expires */
        public int $expiresIn,
    ) {}

    /** @param array{accessToken: string, expiresIn: int} $data the gateway's login response */
    public static function fromArray(array $data): self
    {
        return new self(
            accessToken: $data['accessToken'],
            expiresIn: $data['expiresIn'],
        );
    }
}
