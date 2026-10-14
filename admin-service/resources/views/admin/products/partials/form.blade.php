@use('App\Support\Money')

{{-- Shared by "new product" and "edit product". $product is null when creating. --}}
@csrf

<div>
    <x-input-label for="category_id" :value="__('Category')" />
    <x-select id="category_id" name="category_id" class="w-full" required>
        <option value="">{{ __('Choose a category') }}</option>
        @foreach ($categories as $category)
            <option value="{{ $category->id }}" @selected(old('category_id', $product?->category_id) === $category->id)>{{ $category->indentedName() }}</option>
        @endforeach
    </x-select>
    <x-input-error :messages="$errors->get('category_id')" class="mt-2" />
</div>

<div class="grid gap-6 sm:grid-cols-2">
    <div>
        <x-input-label for="sku" :value="__('SKU')" />
        <x-text-input id="sku" name="sku" type="text" class="mt-1 block w-full" :value="old('sku', $product?->sku)" required />
        <x-input-error :messages="$errors->get('sku')" class="mt-2" />
    </div>

    <div>
        <x-input-label for="price" :value="__('Price')" />
        <x-text-input id="price" name="price" type="text" inputmode="decimal" placeholder="19.99" class="mt-1 block w-full"
                      :value="old('price', $product ? Money::toDecimal($product->price_cents) : null)" required />
        <x-input-error :messages="$errors->get('price')" class="mt-2" />
    </div>
</div>

<div>
    <x-input-label for="name" :value="__('Name')" />
    <x-text-input id="name" name="name" type="text" class="mt-1 block w-full" :value="old('name', $product?->name)" required />
    <x-input-error :messages="$errors->get('name')" class="mt-2" />
</div>

<div>
    <x-input-label for="description" :value="__('Description')" />
    <x-textarea id="description" name="description">{{ old('description', $product?->description) }}</x-textarea>
    <x-input-error :messages="$errors->get('description')" class="mt-2" />
</div>

<div>
    <x-input-label for="image" :value="$product?->image_path ? __('Replace image') : __('Image')" />
    @if ($product?->thumbnailUrl())
        <img src="{{ $product->thumbnailUrl() }}" alt="" class="mt-2 h-24 w-24 rounded-sm object-cover">
    @endif
    <input id="image" name="image" type="file" accept="image/jpeg,image/png,image/webp" class="mt-2 block w-full text-sm text-gray-700">
    <p class="mt-1 text-xs text-gray-500">{{ __('JPG, PNG or WebP, up to 5 MB. The thumbnail is made in the background.') }}</p>
    <x-input-error :messages="$errors->get('image')" class="mt-2" />
</div>

<div class="flex items-center gap-4">
    <x-primary-button>{{ __('Save') }}</x-primary-button>
    <a href="{{ route('admin.products.index') }}" class="text-sm text-gray-600 hover:text-gray-900">{{ __('Cancel') }}</a>
</div>
