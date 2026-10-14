{{-- Shared by "new category" and "edit category". $category is null when creating; $parents never contains
     the category itself or its subcategories (it can't move below itself). --}}
@csrf

<div>
    <x-input-label for="name" :value="__('Name')" />
    <x-text-input id="name" name="name" type="text" class="mt-1 block w-full" :value="old('name', $category?->name)" required />
    <x-input-error :messages="$errors->get('name')" class="mt-2" />
</div>

<div>
    <x-input-label for="parent_id" :value="__('Parent category')" />
    <x-select id="parent_id" name="parent_id" class="w-full">
        <option value="">{{ __('— None (top level) —') }}</option>
        @foreach ($parents as $parent)
            <option value="{{ $parent->id }}" @selected(old('parent_id', $category?->parent_id) === $parent->id)>{{ $parent->indentedName() }}</option>
        @endforeach
    </x-select>
    <x-input-error :messages="$errors->get('parent_id')" class="mt-2" />
</div>

<div class="flex items-center gap-4">
    <x-primary-button>{{ __('Save') }}</x-primary-button>
    <a href="{{ route('admin.categories.index') }}" class="text-sm text-gray-600 hover:text-gray-900">{{ __('Cancel') }}</a>
</div>
