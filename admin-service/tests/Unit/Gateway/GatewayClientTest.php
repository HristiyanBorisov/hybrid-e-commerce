<?php

namespace Tests\Unit\Gateway;

use App\Exceptions\Gateway\GatewayRejectedException;
use App\Exceptions\Gateway\GatewayUnauthorizedException;
use App\Exceptions\Gateway\GatewayUnavailableException;
use App\Gateway\GatewayClient;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\Client\Request as ClientRequest;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Validation\ValidationException;
use PHPUnit\Framework\Attributes\DataProvider;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;
use Tests\TestCase;

final class GatewayClientTest extends TestCase
{
    public function test_it_forwards_the_admins_token_and_the_request_id(): void
    {
        Http::fake([$this->gatewayUrl('users*') => Http::response(['data' => []])]);

        $client = new GatewayClient(Request::create('/admin/users', cookies: ['access_token' => 'admin-token'], server: ['HTTP_X_REQUEST_ID' => 'trace-1']));
        $client->get('users', ['page' => 2]);

        Http::assertSent(fn (ClientRequest $request) => $request->url() === $this->gatewayUrl('users?page=2')
            && $request->hasHeader('Authorization', 'Bearer admin-token')
            && $request->hasHeader('X-Request-Id', 'trace-1')
            && $request->hasHeader('Accept', 'application/json'));
    }

    public function test_it_sends_no_token_when_nobody_is_logged_in(): void
    {
        Http::fake([$this->gatewayUrl('auth/login') => Http::response(['accessToken' => 't', 'expiresIn' => 60])]);

        $this->client()->post('auth/login', ['email' => 'a@example.com', 'password' => 'secret']);

        Http::assertSent(fn (ClientRequest $request) => ! $request->hasHeader('Authorization')
            && $request['email'] === 'a@example.com');
    }

    public function test_patch_and_delete_reach_the_gateway(): void
    {
        Http::fake([$this->gatewayUrl('users/1') => Http::response(['id' => '1'])]);

        $this->assertSame(['id' => '1'], $this->client()->patch('users/1', ['name' => 'Eve']));
        $this->client()->delete('users/1');

        Http::assertSent(fn (ClientRequest $request) => $request->method() === 'PATCH' && $request['name'] === 'Eve');
        Http::assertSent(fn (ClientRequest $request) => $request->method() === 'DELETE');
    }

    public function test_validation_errors_become_form_errors(): void
    {
        Http::fake(['*' => Http::response(['statusCode' => 422, 'message' => 'Validation failed', 'errors' => ['email' => ['email must be an email']]], 422)]);

        try {
            $this->client()->post('users', []);
            $this->fail('Expected a ValidationException.');
        } catch (ValidationException $exception) {
            $this->assertSame(['email' => ['email must be an email']], $exception->errors());
        }
    }

    public function test_a_401_means_the_session_has_ended(): void
    {
        Http::fake(['*' => Http::response(['statusCode' => 401, 'message' => 'Invalid or expired token'], 401)]);

        $this->expectException(GatewayUnauthorizedException::class);

        $this->client()->get('users');
    }

    /** @return array<string, array{0: int, 1: string}> */
    public static function refusals(): array
    {
        return [
            '403' => [403, "You can't delete your own account"],
            '409' => [409, 'Email is already registered'],
        ];
    }

    #[DataProvider('refusals')]
    public function test_403_and_409_are_refusals_with_the_gateways_message(int $status, string $message): void
    {
        Http::fake(['*' => Http::response(['statusCode' => $status, 'message' => $message], $status)]);

        try {
            $this->client()->delete('users/1');
            $this->fail('Expected a GatewayRejectedException.');
        } catch (GatewayRejectedException $exception) {
            $this->assertSame($status, $exception->status);
            $this->assertSame($message, $exception->getMessage());
        }
    }

    public function test_a_404_is_a_not_found_page(): void
    {
        Http::fake(['*' => Http::response(['statusCode' => 404, 'message' => 'User not found'], 404)]);

        $this->expectException(NotFoundHttpException::class);

        $this->client()->get('users/unknown');
    }

    /** @return array<string, array{0: int}> */
    public static function unexpectedAnswers(): array
    {
        return ['500' => [500], '502' => [502], '400 (a bug on our side)' => [400]];
    }

    #[DataProvider('unexpectedAnswers')]
    public function test_server_errors_and_unexpected_answers_mean_unavailable(int $status): void
    {
        Http::fake(['*' => Http::response(['message' => 'boom'], $status)]);

        $this->expectException(GatewayUnavailableException::class);
        $this->expectExceptionMessage("The API gateway answered {$status}: boom");

        $this->client()->get('users');
    }

    public function test_no_answer_means_unavailable(): void
    {
        Http::fake(fn () => throw new ConnectionException('Connection refused'));

        $this->expectException(GatewayUnavailableException::class);

        $this->client()->get('users');
    }

    private function client(): GatewayClient
    {
        return new GatewayClient(Request::create('/admin'));
    }
}
