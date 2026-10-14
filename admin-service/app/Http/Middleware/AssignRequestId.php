<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Symfony\Component\HttpFoundation\Response;

/**
 * Gives every request an id (the caller's X-Request-Id, or a new one): it's added to every log line,
 * returned in the response and forwarded to the API gateway — one id follows a request through both services.
 */
final class AssignRequestId
{
    public const HEADER = 'X-Request-Id';

    /** A caller's id is reused only if it's short and safe to write into the logs */
    private const VALID_REQUEST_ID = '/^[\w-]{1,100}$/';

    public function handle(Request $request, Closure $next): Response
    {
        $incoming = (string) $request->header(self::HEADER);
        $requestId = preg_match(self::VALID_REQUEST_ID, $incoming) === 1 ? $incoming : (string) Str::uuid();

        $request->headers->set(self::HEADER, $requestId);
        Log::withContext(['request_id' => $requestId]);

        $response = $next($request);
        $response->headers->set(self::HEADER, $requestId);

        return $response;
    }
}
