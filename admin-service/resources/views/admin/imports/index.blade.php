@use('App\Dto\Products\ProductCsvRowDto')
@use('App\Enums\ImportStatus')

<x-app-layout>
    <x-slot name="header">
        <h2 class="font-semibold text-xl text-gray-800 leading-tight">{{ __('Import products') }}</h2>
    </x-slot>

    <form method="POST" action="{{ route('admin.imports.store') }}" enctype="multipart/form-data" class="space-y-4 bg-white p-6 shadow-xs sm:rounded-lg">
        @csrf

        <div>
            <x-input-label for="file" :value="__('CSV file')" />
            <input id="file" name="file" type="file" accept=".csv,text/csv" required class="mt-2 block w-full text-sm text-gray-700">
            <x-input-error :messages="$errors->get('file')" class="mt-2" />
        </div>

        <p class="text-sm text-gray-600">
            {{ __('Columns:') }} <code class="rounded-sm bg-gray-100 px-1">{{ implode(',', ProductCsvRowDto::COLUMNS) }}</code>.
            {{ __('A row whose SKU already exists updates that product; any other row creates one. The "Export CSV" file has exactly these columns.') }}
        </p>

        <x-primary-button>{{ __('Import') }}</x-primary-button>
    </form>

    <div class="bg-white shadow-xs sm:rounded-lg overflow-x-auto">
        <table class="min-w-full divide-y divide-gray-200 text-sm">
            <thead class="bg-gray-50 text-left text-gray-600">
                <tr>
                    <th class="px-4 py-3 font-medium">{{ __('Started') }}</th>
                    <th class="px-4 py-3 font-medium">{{ __('File') }}</th>
                    <th class="px-4 py-3 font-medium">{{ __('Status') }}</th>
                    <th class="px-4 py-3 font-medium">{{ __('Imported') }}</th>
                    <th class="px-4 py-3 font-medium">{{ __('Failed') }}</th>
                </tr>
            </thead>
            <tbody class="divide-y divide-gray-100">
                @forelse ($imports as $import)
                    <tr class="align-top">
                        <td class="px-4 py-3 text-gray-500">{{ $import->created_at->format('Y-m-d H:i') }}</td>
                        <td class="px-4 py-3 text-gray-900">
                            {{ $import->file_name }}

                            @if ($import->errors)
                                <details class="mt-2 text-xs text-red-700">
                                    <summary class="cursor-pointer">{{ __('Show problems') }}</summary>
                                    <ul class="mt-1 list-disc ps-5">
                                        @foreach ($import->errors as $error)
                                            <li>{{ __('Row :row', ['row' => $error['row']]) }}: {{ implode(' ', $error['messages']) }}</li>
                                        @endforeach
                                    </ul>
                                </details>
                            @endif
                        </td>
                        <td class="px-4 py-3">
                            <span @class([
                                'rounded-full px-2 py-0.5 text-xs font-medium',
                                'bg-gray-100 text-gray-700' => in_array($import->status, [ImportStatus::Pending, ImportStatus::Processing], true),
                                'bg-green-100 text-green-800' => $import->status === ImportStatus::Completed,
                                'bg-red-100 text-red-800' => $import->status === ImportStatus::Failed,
                            ])>{{ $import->status->label() }}</span>
                        </td>
                        <td class="px-4 py-3 text-gray-700">{{ $import->imported_rows }}</td>
                        <td class="px-4 py-3 text-gray-700">{{ $import->failed_rows }}</td>
                    </tr>
                @empty
                    <tr>
                        <td colspan="5" class="px-4 py-6 text-center text-gray-500">{{ __('No imports yet.') }}</td>
                    </tr>
                @endforelse
            </tbody>
        </table>
    </div>
</x-app-layout>
