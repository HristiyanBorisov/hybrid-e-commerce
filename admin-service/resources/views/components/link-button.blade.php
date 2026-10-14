{{-- A link that looks like <x-primary-button> (a <button> inside an <a> isn't valid HTML) --}}
<a {{ $attributes->merge(['class' => 'inline-flex items-center px-4 py-2 bg-gray-800 border border-transparent rounded-md font-semibold text-xs text-white uppercase tracking-widest hover:bg-gray-700']) }}>
    {{ $slot }}
</a>
