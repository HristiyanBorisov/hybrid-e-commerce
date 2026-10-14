<?php

/*
| The API gateway (NestJS) is the central user service: it checks passwords and issues the login tokens.
| The admin panel calls it over the Docker network and checks its tokens with the public key.
*/

return [

    // Base URL of the gateway's API, inside the Docker network
    'url' => env('GATEWAY_URL', 'http://api-gateway:3000/api/v1'),

    // Seconds to wait for an answer before showing "service unavailable"
    'timeout' => 5,

    // The gateway's internal API: categories and products are synced here (Docker network only)
    'internal_url' => env('GATEWAY_INTERNAL_URL', 'http://api-gateway:3000/internal/v1'),

    // Shared secret for service-to-service calls, in both directions (root .env, X-Api-Key header)
    'api_key' => env('INTERNAL_API_KEY'),

    'jwt' => [
        // Public key only: the admin panel can check tokens but never create them (mounted from keys/public)
        'public_key_path' => env('JWT_PUBLIC_KEY_PATH', '/keys/jwt-public.pem'),
        // Tokens from anyone else are rejected
        'issuer' => 'api-gateway',
    ],

    // The login cookie both services share. Its name lives in App\Auth\AccessTokenCookie::NAME.
    'cookie' => [
        // Sent over HTTPS only — must match the gateway, so it comes from the root .env
        'secure' => (bool) env('AUTH_COOKIE_SECURE', false),
    ],

];
