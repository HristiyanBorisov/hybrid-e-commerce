<x-app-layout>
    <x-slot name="header">
        <div class="flex items-center justify-between">
            <h2 class="font-semibold text-xl text-gray-800 leading-tight">{{ __('Categories') }}</h2>
            <x-link-button :href="route('admin.categories.create')">{{ __('New category') }}</x-link-button>
        </div>
    </x-slot>

    <div class="bg-white shadow-xs sm:rounded-lg overflow-x-auto">
        <table class="min-w-full divide-y divide-gray-200 text-sm">
            <thead class="bg-gray-50 text-left text-gray-600">
                <tr>
                    <th class="px-4 py-3 font-medium">{{ __('Name') }}</th>
                    <th class="px-4 py-3 font-medium">{{ __('Slug') }}</th>
                    <th class="px-4 py-3 font-medium">{{ __('Subcategories') }}</th>
                    <th class="px-4 py-3 font-medium">{{ __('Products') }}</th>
                    <th class="px-4 py-3"></th>
                </tr>
            </thead>
            <tbody class="divide-y divide-gray-100">
                @forelse ($categories as $category)
                    <tr>
                        {{-- Subcategories are indented under their parent --}}
                        <td class="px-4 py-3 text-gray-900" style="padding-left: {{ 1 + $category->depth * 1.5 }}rem">
                            @if ($category->depth > 0)<span class="text-gray-400">└</span>@endif
                            {{ $category->name }}
                        </td>
                        <td class="px-4 py-3 text-gray-500">{{ $category->slug }}</td>
                        <td class="px-4 py-3 text-gray-700">{{ $category->childCount }}</td>
                        <td class="px-4 py-3 text-gray-700">{{ $category->productCount }}</td>
                        <td class="px-4 py-3">
                            <div class="flex justify-end gap-3">
                                <a href="{{ route('admin.categories.edit', $category->id) }}" class="text-indigo-600 hover:text-indigo-900">{{ __('Edit') }}</a>

                                @if ($category->isInUse())
                                    <span class="text-gray-400 cursor-not-allowed" title="{{ __('Only empty categories can be deleted') }}">{{ __('Delete') }}</span>
                                @else
                                    <form method="POST" action="{{ route('admin.categories.destroy', $category->id) }}"
                                          onsubmit="return confirm('{{ __('Delete :name?', ['name' => $category->name]) }}')">
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
                        <td colspan="5" class="px-4 py-6 text-center text-gray-500">{{ __('No categories yet.') }}</td>
                    </tr>
                @endforelse
            </tbody>
        </table>
    </div>
</x-app-layout>
