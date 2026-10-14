<?php

namespace Tests\Feature\Admin;

use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\Client\Request as ClientRequest;
use Illuminate\Support\Facades\Http;
use Tests\Support\TestTokens;
use Tests\TestCase;

final class UsersTest extends TestCase
{
    private const ALICE_ID = '0199e3a0-0000-7000-8000-000000000001';

    // ---- list

    public function test_the_list_shows_the_gateways_users_with_filters_and_pagination(): void
    {
        Http::fake([$this->gatewayUrl('users*') => Http::response([
            'data' => [$this->alice()],
            'meta' => ['page' => 2, 'limit' => 20, 'total' => 45, 'totalPages' => 3],
        ])]);
        $token = TestTokens::admin();

        $this->withUnencryptedCookie('access_token', $token)
            ->get('/admin/users?search=ali&role=customer&page=2')
            ->assertOk()
            ->assertSee('alice@example.com')
            ->assertSee('page=3', escape: false);

        Http::assertSent(fn (ClientRequest $request) => $request->url() === $this->gatewayUrl('users?page=2&limit=20&search=ali&role=customer')
            && $request->hasHeader('Authorization', 'Bearer '.$token));
    }

    public function test_an_invalid_filter_never_reaches_the_gateway(): void
    {
        $this->actingAsAdmin()
            ->get('/admin/users?role=owner')
            ->assertSessionHasErrors('role');

        Http::assertNothingSent();
    }

    // ---- create

    public function test_the_create_form_is_shown(): void
    {
        $this->actingAsAdmin()->get('/admin/users/create')->assertOk()->assertSee('New user');
    }

    public function test_an_admin_creates_a_user_through_the_gateway(): void
    {
        Http::fake([$this->gatewayUrl('users') => Http::response($this->alice(), 201)]);

        $this->actingAsAdmin()
            ->post('/admin/users', ['name' => 'Alice', 'email' => 'Alice@Example.com', 'password' => 'secret-password', 'role' => 'customer'])
            ->assertRedirect('/admin/users')
            ->assertSessionHas('status', 'User alice@example.com created.');

        Http::assertSent(fn (ClientRequest $request) => $request->method() === 'POST' && $request->data() === [
            'name' => 'Alice',
            'email' => 'alice@example.com',
            'password' => 'secret-password',
            'role' => 'customer',
        ]);
    }

    public function test_the_form_is_validated_before_calling_the_gateway(): void
    {
        $this->actingAsAdmin()
            ->post('/admin/users', ['name' => '', 'email' => 'nope', 'password' => 'short', 'role' => 'owner'])
            ->assertSessionHasErrors(['name', 'email', 'password', 'role']);

        Http::assertNothingSent();
    }

    public function test_the_gateways_validation_errors_show_under_the_fields(): void
    {
        Http::fake(['*' => Http::response(['statusCode' => 422, 'message' => 'Validation failed', 'errors' => ['name' => ['name is too long']]], 422)]);

        $this->actingAsAdmin()
            ->post('/admin/users', ['name' => 'Alice', 'email' => 'alice@example.com', 'password' => 'secret-password', 'role' => 'customer'])
            ->assertSessionHasErrors(['name' => 'name is too long']);
    }

    public function test_a_taken_email_shows_under_the_email_field(): void
    {
        Http::fake(['*' => Http::response(['statusCode' => 409, 'message' => 'Email is already registered'], 409)]);

        $this->actingAsAdmin()
            ->post('/admin/users', ['name' => 'Alice', 'email' => 'alice@example.com', 'password' => 'secret-password', 'role' => 'customer'])
            ->assertSessionHasErrors(['email' => 'Email is already registered']);
    }

    // ---- edit

    public function test_the_edit_form_shows_the_user(): void
    {
        Http::fake([$this->gatewayUrl('users/'.self::ALICE_ID) => Http::response($this->alice())]);

        $this->actingAsAdmin()
            ->get('/admin/users/'.self::ALICE_ID.'/edit')
            ->assertOk()
            ->assertSee('Edit Alice')
            ->assertSee('alice@example.com');
    }

    public function test_an_unknown_user_is_a_404(): void
    {
        Http::fake(['*' => Http::response(['statusCode' => 404, 'message' => 'User not found'], 404)]);

        $this->actingAsAdmin()->get('/admin/users/'.self::ALICE_ID.'/edit')->assertNotFound();
    }

    public function test_a_malformed_id_is_a_404_without_calling_the_gateway(): void
    {
        $this->actingAsAdmin()->get('/admin/users/not-a-uuid/edit')->assertNotFound();

        Http::assertNothingSent();
    }

    public function test_an_admin_updates_a_user_and_an_empty_password_is_not_sent(): void
    {
        Http::fake([$this->gatewayUrl('users/'.self::ALICE_ID) => Http::response($this->alice(['name' => 'Alice Adams']))]);

        $this->actingAsAdmin()
            ->put('/admin/users/'.self::ALICE_ID, ['name' => 'Alice Adams', 'email' => 'alice@example.com', 'password' => '', 'role' => 'customer'])
            ->assertRedirect('/admin/users')
            ->assertSessionHas('status', 'User alice@example.com updated.');

        Http::assertSent(fn (ClientRequest $request) => $request->method() === 'PATCH'
            && $request->data() === ['name' => 'Alice Adams', 'email' => 'alice@example.com', 'role' => 'customer']);
    }

    public function test_a_new_password_is_sent_when_filled_in(): void
    {
        Http::fake([$this->gatewayUrl('users/'.self::ALICE_ID) => Http::response($this->alice())]);

        $this->actingAsAdmin()->put('/admin/users/'.self::ALICE_ID, ['name' => 'Alice', 'email' => 'alice@example.com', 'password' => 'brand-new-password', 'role' => 'customer']);

        Http::assertSent(fn (ClientRequest $request) => $request['password'] === 'brand-new-password');
    }

    public function test_a_taken_email_on_update_shows_under_the_email_field(): void
    {
        Http::fake(['*' => Http::response(['statusCode' => 409, 'message' => 'Email is already registered'], 409)]);

        $this->actingAsAdmin()
            ->put('/admin/users/'.self::ALICE_ID, ['name' => 'Alice', 'email' => 'bob@example.com', 'role' => 'customer'])
            ->assertSessionHasErrors(['email' => 'Email is already registered']);
    }

    public function test_the_gateways_refusal_is_shown_as_a_message(): void
    {
        Http::fake(['*' => Http::response(['statusCode' => 403, 'message' => "You can't change your own role"], 403)]);

        $editPage = '/admin/users/'.TestTokens::ADMIN_ID.'/edit';

        $this->actingAsAdmin()
            ->from($editPage)
            ->put('/admin/users/'.TestTokens::ADMIN_ID, ['name' => 'Admin', 'email' => 'admin@example.com', 'role' => 'customer'])
            ->assertRedirect($editPage)
            ->assertSessionHas('error', "You can't change your own role");
    }

    // ---- delete

    public function test_an_admin_deletes_a_user(): void
    {
        Http::fake([$this->gatewayUrl('users/'.self::ALICE_ID) => Http::response(null, 204)]);

        $this->actingAsAdmin()
            ->delete('/admin/users/'.self::ALICE_ID)
            ->assertRedirect('/admin/users')
            ->assertSessionHas('status', 'User deleted.');

        Http::assertSent(fn (ClientRequest $request) => $request->method() === 'DELETE');
    }

    public function test_admins_cannot_delete_themselves(): void
    {
        Http::fake(['*' => Http::response(['statusCode' => 403, 'message' => "You can't delete your own account"], 403)]);

        $this->actingAsAdmin()
            ->from('/admin/users')
            ->delete('/admin/users/'.TestTokens::ADMIN_ID)
            ->assertRedirect('/admin/users')
            ->assertSessionHas('error', "You can't delete your own account");
    }

    // ---- when the gateway says no or isn't there

    public function test_when_the_gateway_rejects_the_token_the_admin_is_logged_out(): void
    {
        Http::fake(['*' => Http::response(['statusCode' => 401, 'message' => 'Invalid or expired token'], 401)]);

        $this->actingAsAdmin()
            ->get('/admin/users')
            ->assertRedirect('/admin/login')
            ->assertCookieExpired('access_token')
            ->assertSessionHas('status', 'Your session has ended. Please log in again.');
    }

    public function test_a_friendly_page_is_shown_when_the_gateway_is_down(): void
    {
        Http::fake(fn () => throw new ConnectionException('Connection refused'));

        $this->actingAsAdmin()
            ->get('/admin/users')
            ->assertStatus(503)
            ->assertSee('Service unavailable');
    }

    /** @return array<string, string> a user as the gateway returns it */
    private function alice(array $overrides = []): array
    {
        return [
            'id' => self::ALICE_ID,
            'name' => 'Alice',
            'email' => 'alice@example.com',
            'role' => 'customer',
            'createdAt' => '2026-10-11T12:09:14.042Z',
            ...$overrides,
        ];
    }
}
