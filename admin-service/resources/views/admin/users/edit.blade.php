<x-app-layout>
    <x-slot name="header">
        <h2 class="font-semibold text-xl text-gray-800 leading-tight">{{ __('Edit :name', ['name' => $user->name]) }}</h2>
    </x-slot>

    <form method="POST" action="{{ route('admin.users.update', $user->id) }}" class="max-w-xl space-y-6 bg-white p-6 shadow-xs sm:rounded-lg">
        @method('PUT')
        @include('admin.users.partials.form', ['user' => $user])
    </form>
</x-app-layout>
