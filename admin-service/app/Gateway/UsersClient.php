<?php

namespace App\Gateway;

use App\Dto\Users\CreateUserDto;
use App\Dto\Users\UpdateUserDto;
use App\Dto\Users\UserDto;
use App\Dto\Users\UserFilterDto;
use App\Dto\Users\UserPageDto;
use App\Exceptions\Gateway\GatewayRejectedException;
use Illuminate\Validation\ValidationException;

/** User management through the API gateway, which owns the users (/api/v1/users, admins only). */
final readonly class UsersClient
{
    public function __construct(private GatewayClient $gateway) {}

    public function list(UserFilterDto $filter): UserPageDto
    {
        return UserPageDto::fromArray($this->gateway->get('users', array_filter([
            'page' => $filter->page,
            'limit' => UserFilterDto::PER_PAGE,
            'search' => $filter->search,
            'role' => $filter->role?->value,
        ])));
    }

    public function find(string $id): UserDto
    {
        return UserDto::fromArray($this->gateway->get("users/{$id}"));
    }

    public function create(CreateUserDto $user): UserDto
    {
        try {
            return UserDto::fromArray($this->gateway->post('users', [
                'name' => $user->name,
                'email' => $user->email,
                'password' => $user->password,
                'role' => $user->role->value,
            ]));
        } catch (GatewayRejectedException $exception) {
            throw $this->asEmailErrorWhenTaken($exception);
        }
    }

    public function update(string $id, UpdateUserDto $changes): UserDto
    {
        try {
            return UserDto::fromArray($this->gateway->patch("users/{$id}", array_filter([
                'name' => $changes->name,
                'email' => $changes->email,
                'role' => $changes->role->value,
                'password' => $changes->password,
            ])));
        } catch (GatewayRejectedException $exception) {
            throw $this->asEmailErrorWhenTaken($exception);
        }
    }

    public function delete(string $id): void
    {
        $this->gateway->delete("users/{$id}");
    }

    /** For users, a 409 means "Email is already registered" — shown under the email field. */
    private function asEmailErrorWhenTaken(GatewayRejectedException $exception): GatewayRejectedException|ValidationException
    {
        return $exception->status === 409
            ? ValidationException::withMessages(['email' => $exception->getMessage()])
            : $exception;
    }
}
