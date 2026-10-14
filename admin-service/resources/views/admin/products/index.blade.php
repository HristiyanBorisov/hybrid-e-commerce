@use('App\Enums\TrashedFilter')
@use('App\Support\Money')

<x-app-layout>
    <x-slot name="header">
        <div class="flex flex-wrap items-center justify-between gap-3">
            <h2 class="font-semibold text-xl text-gray-800 leading-tight">{{ __('Products') }}</h2>

            <div class="flex gap-3">
                <a href="{{ route('admin.imports.index') }}" class="inline-flex items-center px-4 py-2 text-sm text-gray-700 hover:text-gray-900">{{ __('Import CSV') }}</a>
                <a href="{{ route('admin.products.export') }}" class="inline-flex items-center px-4 py-2 text-sm text-gray-700 hover:text-gray-900">{{ __('Export CSV') }}</a>
                <x-link-button :href="route('admin.products.create')">{{ __('New product') }}</x-link-button>
            </div>
        </div>
    </x-slot>

    {{-- Filters --}}
    <form method="GET" action="{{ route('admin.products.index') }}" class="flex flex-wrap items-end gap-4 bg-white p-4 shadow-xs sm:rounded-lg">
        <div>
            <x-input-label for="search" :value="__('Name or SKU')" />
            <x-text-input id="search" name="search" type="search" class="mt-1 block" :value="$filter->search" />
        </div>

        <div>
            <x-input-label for="category_id" :value="__('Category (with subcategories)')" />
            <x-select id="category_id" name="category_id">
                <option value="">{{ __('All categories') }}</option>
                @foreach ($categories as $category)
                    <option value="{{ $category->id }}" @selected($filter->categoryId === $category->id)>{{ $category->indentedName() }}</option>
                @endforeach
            </x-select>
        </div>

        <div>
            <x-input-label for="trashed" :value="__('Show')" />
            <x-select id="trashed" name="trashed">
                @foreach ($trashedFilters as $trashedFilter)
                    <option value="{{ $trashedFilter->value }}" @selected($filter->trashed === $trashedFilter)>{{ $trashedFilter->label() }}</option>
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
                    <th class="px-4 py-3 font-medium w-16"></th>
                    <th class="px-4 py-3 font-medium">{{ __('Product') }}</th>
                    <th class="px-4 py-3 font-medium">{{ __('Category') }}</th>
                    <th class="px-4 py-3 font-medium text-right">{{ __('Price') }}</th>
                    <th class="px-4 py-3 font-medium text-right">{{ __('Stock') }}</th>
                    <th class="px-4 py-3"></th>
                </tr>
            </thead>
            <tbody class="divide-y divide-gray-100">
                @forelse ($products as $product)
                    <tr @class(['bg-gray-50 text-gray-500' => $product->trashed()])>
                        <td class="px-4 py-2">
                            @if ($product->thumbnailUrl())
                                <img src="{{ $product->thumbnailUrl() }}" alt="" class="h-10 w-10 rounded-sm object-cover">
                            @else
                                {{-- No image, or its thumbnail is still being made in the queue --}}
                                <div class="h-10 w-10 rounded-sm bg-gray-100"></div>
                            @endif
                        </td>
                        <td class="px-4 py-3">
                            <div class="text-gray-900">{{ $product->name }}</div>
                            <div class="text-xs text-gray-500">{{ $product->sku }}</div>
                        </td>
                        <td class="px-4 py-3 text-gray-700">{{ $product->category->name }}</td>
                        <td class="px-4 py-3 text-right text-gray-900">{{ Money::format($product->price_cents) }}</td>
                        <td @class(['px-4 py-3 text-right', 'font-medium text-red-600' => $product->stock() <= $lowStock, 'text-gray-700' => $product->stock() > $lowStock])>{{ $product->stock() }}</td>
                        <td class="px-4 py-3">
                            <div class="flex justify-end gap-3">
                                @if ($product->trashed())
                                    <form method="POST" action="{{ route('admin.products.restore', $product->id) }}">
                                        @csrf
                                        <button type="submit" class="text-indigo-600 hover:text-indigo-900">{{ __('Restore') }}</button>
                                    </form>
                                @else
                                    <a href="{{ route('admin.products.edit', $product->id) }}" class="text-indigo-600 hover:text-indigo-900">{{ __('Edit') }}</a>

                                    <form method="POST" action="{{ route('admin.products.destroy', $product->id) }}"
                                          onsubmit="return confirm('{{ __('Move :name to the trash?', ['name' => $product->name]) }}')">
                                        @csrf
                                        @method('DELETE')
                                        <button type="submit" class="text-red-600 hover:text-red-900">{{ __('Delete') }}</button>
                                    </form>
                                @endif
                            </div>
                        </td>
                    </tr>
                @empty
                    <tr>
                        <td colspan="6" class="px-4 py-6 text-center text-gray-500">
                            {{ $filter->trashed === TrashedFilter::Only ? __('The trash is empty.') : __('No products found.') }}
                        </td>
                    </tr>
                @endforelse
            </tbody>
        </table>
    </div>

    {{ $products->links() }}
</x-app-layout>
