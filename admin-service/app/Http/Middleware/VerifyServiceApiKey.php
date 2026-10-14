<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Protects the internal API (/internal/v1/…): only the API gateway, which knows the shared key, may call it.
 * hash_equals takes the same time however much of the key matches, so timing can't reveal it.
 */
final class VerifyServiceApiKey
{
    public const HEADER = 'X-Api-Key';

    public function handle(Request $request, Closure $next): Response
    {
        $expected = (string) config('gateway.api_key');
        $given = (string) $request->header(self::HEADER);

        abort_if($expected === '' || ! hash_equals($expected, $given), 401, __('Invalid API key.'));

        return $next($request);
    }
}
