<?php

namespace App\Gateway;

use App\Auth\AccessTokenCookie;
use App\Exceptions\Gateway\GatewayRejectedException;
use App\Exceptions\Gateway\GatewayUnauthorizedException;
use App\Exceptions\Gateway\GatewayUnavailableException;
use App\Http\Middleware\AssignRequestId;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\Client\PendingRequest;
use Illuminate\Http\Client\Response;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

/**
 * Talks to the API gateway (NestJS) over the Docker network.
 *
 * Every call carries the logged-in admin's own token, so the gateway knows who is acting and checks
 * their role again. The request id is forwarded, so one id follows a request through both services.
 * The gateway's answers become normal Laravel behaviour: see throwIfFailed().
 */
class GatewayClient
{
    public function __construct(private readonly Request $request) {}

    /** @return array<string, mixed> */
    public function get(string $path, array $query = []): array
    {
        return $this->send('GET', $path, ['query' => $query])->json();
    }

    /** @return array<string, mixed> */
    public function post(string $path, array $data): array
    {
        return $this->send('POST', $path, ['json' => $data])->json();
    }

    /** @return array<string, mixed> */
    public function patch(string $path, array $data): array
    {
        return $this->send('PATCH', $path, ['json' => $data])->json();
    }

    public function delete(string $path): void
    {
        $this->send('DELETE', $path);
    }

    private function send(string $method, string $path, array $options = []): Response
    {
        try {
            $response = $this->http()->send($method, $path, $options);
        } catch (ConnectionException $exception) {
            throw new GatewayUnavailableException('The API gateway did not answer.', previous: $exception);
        }

        return $this->throwIfFailed($response);
    }

    private function http(): PendingRequest
    {
        $http = Http::baseUrl(config('gateway.url'))
            ->timeout(config('gateway.timeout'))
            ->acceptJson()
            ->withHeaders([AssignRequestId::HEADER => (string) $this->request->header(AssignRequestId::HEADER)]);

        $token = $this->request->cookie(AccessTokenCookie::NAME);

        return is_string($token) && $token !== '' ? $http->withToken($token) : $http;
    }

    private function throwIfFailed(Response $response): Response
    {
        $message = (string) $response->json('message');

        return match (true) {
            $response->successful() => $response,
            // The form fields get the gateway's validation messages
            $response->status() === 422 => throw ValidationException::withMessages($response->json('errors', [])),
            $response->status() === 401 => throw new GatewayUnauthorizedException($message),
            $response->status() === 403, $response->status() === 409 => throw new GatewayRejectedException($response->status(), $message),
            $response->status() === 404 => throw new NotFoundHttpException($message),
            default => throw new GatewayUnavailableException("The API gateway answered {$response->status()}: {$message}"),
        };
    }
}
