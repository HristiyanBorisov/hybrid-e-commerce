<?php

use App\Auth\AccessTokenCookie;
use App\Http\Middleware\AssignRequestId;
use App\Http\Middleware\EnsureUserIsAdmin;
use App\Http\Middleware\VerifyServiceApiKey;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Request;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        // The internal API for the API gateway (stateless "api" middleware group): /internal/v1/…
        api: __DIR__.'/../routes/internal.php',
        apiPrefix: 'internal/v1',
        commands: __DIR__.'/../routes/console.php',
        channels: __DIR__.'/../routes/channels.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->prepend(AssignRequestId::class);

        // The login cookie comes from the API gateway as plain text (a signed token) — Laravel must not decrypt it
        $middleware->encryptCookies(except: [AccessTokenCookie::NAME]);

        $middleware->alias(['admin' => EnsureUserIsAdmin::class]);

        // Every internal API call needs the shared API key — checked first, before anything else runs
        $middleware->api(prepend: [VerifyServiceApiKey::class]);

        $middleware->redirectGuestsTo(fn () => route('admin.login'));
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        $exceptions->shouldRenderJsonWhen(
            fn (Request $request) => $request->is('internal/*') || $request->expectsJson(),
        );
    })->create();
