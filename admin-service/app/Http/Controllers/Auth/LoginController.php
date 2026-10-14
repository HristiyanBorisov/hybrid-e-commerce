<?php

namespace App\Http\Controllers\Auth;

use App\Actions\Auth\LoginAction;
use App\Auth\AccessTokenCookie;
use App\Auth\GatewayUser;
use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\LoginRequest;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\View\View;

final class LoginController extends Controller
{
    /**
     * The login form. Admins who are already logged in go straight to the dashboard; customers
     * (who may carry the shared cookie from the API) still see the form, so they can log in as an admin.
     */
    public function create(Request $request): View|RedirectResponse
    {
        $user = $request->user();

        if ($user instanceof GatewayUser && $user->isAdmin()) {
            return redirect()->route('admin.dashboard');
        }

        return view('auth.login');
    }

    public function store(LoginRequest $request, LoginAction $login, AccessTokenCookie $cookie): RedirectResponse
    {
        $token = $request->authenticate($login);

        $request->session()->regenerate();

        return redirect()
            ->intended(route('admin.dashboard'))
            ->withCookie($cookie->make($token));
    }

    /** Clears the shared cookie: this also logs the browser out of the API. */
    public function destroy(Request $request, AccessTokenCookie $cookie): RedirectResponse
    {
        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return redirect()
            ->route('admin.login')
            ->withCookie($cookie->forget());
    }
}
