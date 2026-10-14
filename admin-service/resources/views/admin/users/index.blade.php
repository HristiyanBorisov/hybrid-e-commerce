<x-app-layout>
    <x-slot name="header">
        <div class="flex items-center justify-between">
            <h2 class="font-semibold text-xl text-gray-800 leading-tight">{{ __('Users') }}</h2>

            <x-link-button :href="route('admin.users.create')">{{ __('New user') }}</x-link-button>
        </div>
    </x-slot>

    {{-- Filters --}}
    <form method="GET" action="{{ route('admin.users.index') }}" class="flex flex-wrap items-end gap-4 bg-white p-4 shadow-xs sm:rounded-lg">
        <div>
            <x-input-label for="search" :value="__('Name or email')" />
            <x-text-input id="search" name="search" type="search" class="mt-1 block" :value="$filter->search" />
        </div>

        <div>
            <x-input-label for="role" :value="__('Role')" />
            <x-select id="role" name="role">
                <option value="">{{ __('All roles') }}</option>
                @foreach ($roles as $role)
                    <option value="{{ $role->value }}" @selected($filter->role === $role)>{{ $role->label() }}</option>
                @endforeach
            </x-select>
        </div>

        <x-primary-button>{{ __('Filter') }}</x-primary-button>
        <x-input-error :messages="$errors->all()" />
    </form>

    {{-- List --}}
    <div class="bg-white shadow-xs sm:rounded-lg overflow-x-auto">
        <table class="min-w-full divide-y divide-gray-200 text-sm">
            <thead class="bg-gray-50 text-left text-gray-600">
                <tr>
                    <th class="px-4 py-3 font-medium">{{ __('Name') }}</th>
                    <th class="px-4 py-3 font-medium">{{ __('Email') }}</th>
                    <th class="px-4 py-3 font-medium">{{ __('Role') }}</th>
                    <th class="px-4 py-3 font-medium">{{ __('Created') }}</th>
                    <th class="px-4 py-3"></th>
                </tr>
            </thead>
            <tbody class="divide-y divide-gray-100">
                @forelse ($users as $user)
                    <tr>
                        <td class="px-4 py-3 text-gray-900">{{ $user->name }}</td>
                        <td class="px-4 py-3 text-gray-700">{{ $user->email }}</td>
                        <td class="px-4 py-3">
                            <span @class([
                                'rounded-full px-2 py-0.5 text-xs font-medium',
                                'bg-indigo-100 text-indigo-800' => $user->role->value === 'admin',
                                'bg-gray-100 text-gray-700' => $user->role->value === 'customer',
                            ])>{{ $user->role->label() }}</span>
                        </td>
                        <td class="px-4 py-3 text-gray-500">{{ $user->createdAt->format('Y-m-d H:i') }}</td>
                        <td class="px-4 py-3">
                            <div class="flex justify-end gap-3">
                                <a href="{{ route('admin.users.edit', $user->id) }}" class="text-indigo-600 hover:text-indigo-900">{{ __('Edit') }}</a>

                                <form method="POST" action="{{ route('admin.users.destroy', $user->id) }}"
                                      onsubmit="return confirm('{{ __('Delete :email?', ['email' => $user->email]) }}')">
                                    @csrf
                                    @method('DELETE')
                                    <button type="submit" class="text-red-600 hover:text-red-900">{{ __('Delete') }}</button>
                                </form>
                            </div>
                        </td>
                    </tr>
                @empty
                    <tr>
                        <td colspan="5" class="px-4 py-6 text-center text-gray-500">{{ __('No users found.') }}</td>
                    </tr>
                @endforelse
            </tbody>
        </table>
    </div>

    {{ $users->links() }}
</x-app-layout>
