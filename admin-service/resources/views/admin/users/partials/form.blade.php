{{-- Shared by "create user" and "edit user". $user is null when creating. --}}
@csrf

<div>
    <x-input-label for="name" :value="__('Name')" />
    <x-text-input id="name" name="name" type="text" class="mt-1 block w-full" :value="old('name', $user?->name)" required />
    <x-input-error :messages="$errors->get('name')" class="mt-2" />
</div>

<div>
    <x-input-label for="email" :value="__('Email')" />
    <x-text-input id="email" name="email" type="email" class="mt-1 block w-full" :value="old('email', $user?->email)" required />
    <x-input-error :messages="$errors->get('email')" class="mt-2" />
</div>

<div>
    <x-input-label for="password" :value="$user ? __('New password (leave empty to keep the current one)') : __('Password')" />
    <x-text-input id="password" name="password" type="password" class="mt-1 block w-full" autocomplete="new-password" :required="$user === null" />
    <x-input-error :messages="$errors->get('password')" class="mt-2" />
</div>

<div>
    <x-input-label for="role" :value="__('Role')" />
    <x-select id="role" name="role" class="w-full">
        @foreach ($roles as $role)
            <option value="{{ $role->value }}" @selected(old('role', $user?->role->value ?? 'customer') === $role->value)>{{ $role->label() }}</option>
        @endforeach
    </x-select>
    <x-input-error :messages="$errors->get('role')" class="mt-2" />
</div>

<div class="flex items-center gap-4">
    <x-primary-button>{{ __('Save') }}</x-primary-button>
    <a href="{{ route('admin.users.index') }}" class="text-sm text-gray-600 hover:text-gray-900">{{ __('Cancel') }}</a>
</div>
