{{-- A select box styled like <x-text-input> --}}
<select {{ $attributes->merge(['class' => 'mt-1 block border-gray-300 rounded-md shadow-xs focus:border-indigo-500 focus:ring-indigo-500']) }}>
    {{ $slot }}
</select>
