<?php

namespace App\Http\Middleware;

use App\Auth\GatewayUser;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Admins only. Customers who logged in through the API carry the same shared cookie, so they count as
 * "logged in" here too — this is what keeps them out of the admin panel.
 */
final class EnsureUserIsAdmin
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        abort_unless($user instanceof GatewayUser && $user->isAdmin(), 403, __('Admins only.'));

        return $next($request);
    }
}
