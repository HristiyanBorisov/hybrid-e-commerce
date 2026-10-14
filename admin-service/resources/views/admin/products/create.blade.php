<x-app-layout>
    <x-slot name="header">
        <h2 class="font-semibold text-xl text-gray-800 leading-tight">{{ __('New product') }}</h2>
    </x-slot>

    <form method="POST" action="{{ route('admin.products.store') }}" enctype="multipart/form-data" class="max-w-2xl space-y-6 bg-white p-6 shadow-xs sm:rounded-lg">
        @include('admin.products.partials.form', ['product' => null])
    </form>
</x-app-layout>
