<?php

namespace App\Http\Requests\Users;

use App\Dto\Users\UpdateUserDto;
use App\Enums\UserRole;
use App\Http\Requests\Concerns\NormalizesEmail;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/** The "edit user" form. An empty password keeps the current one. */
final class UpdateUserRequest extends FormRequest
{
    use NormalizesEmail;

    /** @return array<string, array<int, mixed>> */
    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'string', 'email', 'max:255'],
            'password' => ['nullable', 'string', 'min:8', 'max:72'],
            'role' => ['required', Rule::enum(UserRole::class)],
        ];
    }

    public function toDto(): UpdateUserDto
    {
        return new UpdateUserDto(
            name: $this->validated('name'),
            email: $this->validated('email'),
            role: $this->enum('role', UserRole::class),
            password: $this->validated('password'),
        );
    }
}
