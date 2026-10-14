<x-app-layout>
    <x-slot name="header">
        <h2 class="font-semibold text-xl text-gray-800 leading-tight">{{ __('Edit :name', ['name' => $category->name]) }}</h2>
    </x-slot>

    <form method="POST" action="{{ route('admin.categories.update', $category->id) }}" class="max-w-xl space-y-6 bg-white p-6 shadow-xs sm:rounded-lg">
        @method('PUT')
        @include('admin.categories.partials.form', ['category' => $category])
    </form>
</x-app-layout>
