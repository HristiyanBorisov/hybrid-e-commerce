<?php

namespace App\Http\Requests\Users;

use App\Dto\Users\UserFilterDto;
use App\Enums\UserRole;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/** The filters of the user list: ?search=&role=&page= */
final class ListUsersRequest extends FormRequest
{
    /** @return array<string, array<int, mixed>> */
    public function rules(): array
    {
        return [
            'search' => ['nullable', 'string', 'max:100'],
            'role' => ['nullable', Rule::enum(UserRole::class)],
            'page' => ['nullable', 'integer', 'min:1'],
        ];
    }

    public function toDto(): UserFilterDto
    {
        return new UserFilterDto(
            page: (int) ($this->validated('page') ?? 1),
            search: $this->validated('search'),
            role: $this->enum('role', UserRole::class),
        );
    }
}
