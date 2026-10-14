<?php

namespace App\Http\Requests\Auth;

use App\Actions\Auth\LoginAction;
use App\Dto\Auth\AccessTokenDto;
use App\Dto\Auth\LoginDto;
use App\Http\Requests\Concerns\NormalizesEmail;
use Illuminate\Auth\Events\Lockout;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

/** The admin login form. Kept from Breeze: at most 5 failed attempts per email and IP address. */
final class LoginRequest extends FormRequest
{
    use NormalizesEmail;

    private const MAX_ATTEMPTS = 5;

    /** @return array<string, array<int, string>> */
    public function rules(): array
    {
        return [
            'email' => ['required', 'string', 'email'],
            'password' => ['required', 'string'],
        ];
    }

    public function toDto(): LoginDto
    {
        return new LoginDto(
            email: $this->validated('email'),
            password: $this->validated('password'),
        );
    }

    /**
     * Logs in through the API gateway, counting failed attempts.
     *
     * @throws ValidationException when the credentials are wrong, not an admin's, or tried too often
     */
    public function authenticate(LoginAction $login): AccessTokenDto
    {
        $this->ensureIsNotRateLimited();

        try {
            $token = $login->execute($this->toDto());
        } catch (ValidationException $exception) {
            RateLimiter::hit($this->throttleKey());

            throw $exception;
        }

        RateLimiter::clear($this->throttleKey());

        return $token;
    }

    private function ensureIsNotRateLimited(): void
    {
        if (! RateLimiter::tooManyAttempts($this->throttleKey(), self::MAX_ATTEMPTS)) {
            return;
        }

        event(new Lockout($this));

        $seconds = RateLimiter::availableIn($this->throttleKey());

        throw ValidationException::withMessages([
            'email' => __('auth.throttle', ['seconds' => $seconds, 'minutes' => ceil($seconds / 60)]),
        ]);
    }

    private function throttleKey(): string
    {
        return Str::transliterate(Str::lower($this->string('email')).'|'.$this->ip());
    }
}
