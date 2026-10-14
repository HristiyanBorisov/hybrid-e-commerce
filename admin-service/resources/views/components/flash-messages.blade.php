{{-- Success ("status") and error messages set with ->with(...) on a redirect --}}
@if (session('status'))
    <div class="rounded-md bg-green-50 px-4 py-3 text-sm text-green-800" role="status">
        {{ session('status') }}
    </div>
@endif

@if (session('error'))
    <div class="rounded-md bg-red-50 px-4 py-3 text-sm text-red-800" role="alert">
        {{ session('error') }}
    </div>
@endif
