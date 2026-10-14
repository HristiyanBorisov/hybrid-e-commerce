<x-guest-layout>
    <h1 class="text-lg font-semibold text-gray-900">{{ __('Service unavailable') }}</h1>

    <p class="mt-2 text-sm text-gray-600">
        {{ __("The API gateway isn't answering right now. Please try again in a moment.") }}
    </p>

    <a href="{{ url()->current() }}" class="mt-4 inline-block text-sm text-indigo-600 hover:text-indigo-900">{{ __('Try again') }}</a>
</x-guest-layout>
