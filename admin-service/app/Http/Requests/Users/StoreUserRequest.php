<?php

namespace App\Http\Requests\Users;

use App\Dto\Users\CreateUserDto;
use App\Enums\UserRole;
use App\Http\Requests\Concerns\NormalizesEmail;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * The "create user" form. Same rules as the API gateway, so mistakes show up without a round trip;
 * the gateway still validates everything (it owns the users).
 */
final class StoreUserRequest extends FormRequest
{
    use NormalizesEmail;

    /** @return array<string, array<int, mixed>> */
    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'string', 'email', 'max:255'],
            // bcrypt ignores everything after 72 characters
            'password' => ['required', 'string', 'min:8', 'max:72'],
            'role' => ['required', Rule::enum(UserRole::class)],
        ];
    }

    public function toDto(): CreateUserDto
    {
        return new CreateUserDto(
            name: $this->validated('name'),
            email: $this->validated('email'),
            password: $this->validated('password'),
            role: $this->enum('role', UserRole::class),
        );
    }
}
