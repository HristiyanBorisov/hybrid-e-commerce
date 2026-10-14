<?php

namespace App\Exceptions\Gateway;

use App\Auth\AccessTokenCookie;
use Illuminate\Contracts\Debug\ShouldntReport;
use Illuminate\Http\RedirectResponse;
use RuntimeException;

/**
 * The API gateway no longer accepts the login token (expired, or the admin was deleted in the meantime).
 * The cookie is cleared — otherwise this app would keep treating its contents as a valid login.
 */
final class GatewayUnauthorizedException extends RuntimeException implements ShouldntReport
{
    public function render(): RedirectResponse
    {
        return redirect()
            ->route('admin.login')
            ->withCookie(app(AccessTokenCookie::class)->forget())
            ->with('status', __('Your session has ended. Please log in again.'));
    }
}
