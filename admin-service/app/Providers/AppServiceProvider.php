<?php

namespace App\Providers;

use App\Auth\AccessTokenVerifier;
use App\Auth\JwtCookieAuthenticator;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        // Checks login tokens with the API gateway's public key (read once, only when first needed)
        $this->app->singleton(AccessTokenVerifier::class, fn (): AccessTokenVerifier => AccessTokenVerifier::fromKeyFile(
            path: config('gateway.jwt.public_key_path'),
            issuer: config('gateway.jwt.issuer'),
        ));
    }

    public function boot(): void
    {
        // The "jwt-cookie" auth driver (config/auth.php): the logged-in user comes from the shared login cookie
        Auth::viaRequest('jwt-cookie', fn (Request $request) => $this->app->make(JwtCookieAuthenticator::class)($request));
    }
}
