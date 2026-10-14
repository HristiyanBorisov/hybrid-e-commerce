<?php

namespace App\Http\Requests\Concerns;

/** Trims and lowercases the email before validation, so "Eve@Example.com " and "eve@example.com" are the same user. */
trait NormalizesEmail
{
    protected function prepareForValidation(): void
    {
        if (is_string($this->input('email'))) {
            $this->merge(['email' => mb_strtolower(trim($this->input('email')))]);
        }
    }
}
