{{-- A multi-line text field styled like <x-text-input> --}}
<textarea {{ $attributes->merge(['class' => 'mt-1 block w-full border-gray-300 rounded-md shadow-xs focus:border-indigo-500 focus:ring-indigo-500', 'rows' => 4]) }}>{{ $slot }}</textarea>
