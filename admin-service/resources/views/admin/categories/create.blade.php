<x-app-layout>
    <x-slot name="header">
        <h2 class="font-semibold text-xl text-gray-800 leading-tight">{{ __('New category') }}</h2>
    </x-slot>

    <form method="POST" action="{{ route('admin.categories.store') }}" class="max-w-xl space-y-6 bg-white p-6 shadow-xs sm:rounded-lg">
        @include('admin.categories.partials.form', ['category' => null])
    </form>
</x-app-layout>
