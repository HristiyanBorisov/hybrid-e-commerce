<?php

namespace App\Exceptions\Gateway;

use Illuminate\Contracts\Debug\ShouldntReport;
use Illuminate\Http\RedirectResponse;
use RuntimeException;

/**
 * The API gateway refused the action (403 or 409), e.g. "You can't delete your own account".
 * The admin goes back to the page with the gateway's message.
 */
final class GatewayRejectedException extends RuntimeException implements ShouldntReport
{
    public function __construct(
        public readonly int $status,
        string $message,
    ) {
        parent::__construct($message);
    }

    public function render(): RedirectResponse
    {
        return back()->with('error', $this->getMessage());
    }
}
