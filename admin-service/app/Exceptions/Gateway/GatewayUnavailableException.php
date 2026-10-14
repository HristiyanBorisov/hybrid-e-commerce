<?php

namespace App\Exceptions\Gateway;

use Illuminate\Http\Response;
use RuntimeException;

/**
 * The API gateway didn't answer, or answered with a server error.
 * The admin sees a friendly 503 page; the details are logged.
 */
final class GatewayUnavailableException extends RuntimeException
{
    public function render(): Response
    {
        return response()->view('errors.gateway-unavailable', status: 503);
    }
}
