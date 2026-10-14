<x-app-layout>
    <x-slot name="header">
        <h2 class="font-semibold text-xl text-gray-800 leading-tight">{{ __('Edit :name', ['name' => $product->name]) }}</h2>
    </x-slot>

    <form method="POST" action="{{ route('admin.products.update', $product->id) }}" enctype="multipart/form-data" class="max-w-2xl space-y-6 bg-white p-6 shadow-xs sm:rounded-lg">
        @method('PUT')
        @include('admin.products.partials.form', ['product' => $product])
    </form>

    {{-- Stock is owned by the API gateway: the adjustment goes through it --}}
    <form method="POST" action="{{ route('admin.products.stock-adjustments.store', $product->id) }}" class="max-w-2xl space-y-4 bg-white p-6 shadow-xs sm:rounded-lg">
        @csrf
        <div class="flex items-baseline justify-between">
            <h3 class="font-medium text-gray-900">{{ __('Stock') }}</h3>
            <span class="text-sm text-gray-700">{{ __(':count in stock', ['count' => $product->stock()]) }}</span>
        </div>

        <div class="flex flex-wrap items-end gap-4">
            <div>
                <x-input-label for="quantity_change" :value="__('Add (e.g. 25) or remove (e.g. -3)')" />
                <x-text-input id="quantity_change" name="quantity_change" type="number" step="1" class="mt-1 block w-48" :value="old('quantity_change')" required />
            </div>
            <x-primary-button>{{ __('Adjust stock') }}</x-primary-button>
        </div>
        <x-input-error :messages="$errors->get('quantity_change')" />
    </form>
</x-app-layout>
