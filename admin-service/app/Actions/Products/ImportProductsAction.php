<?php

namespace App\Actions\Products;

use App\Dto\Products\ProductCsvRowDto;
use App\Enums\ImportStatus;
use App\Models\Category;
use App\Models\Product;
use App\Models\ProductImport;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rule;
use SplFileObject;

/**
 * Reads a product CSV (sku,name,category_slug,price,description) row by row. Runs in the queue (ImportProductsCsv).
 *
 * - A row whose SKU exists updates that product; otherwise it creates one. Running an import twice changes nothing.
 * - Invalid rows are skipped and reported with their line number; the valid ones are still imported.
 */
final class ImportProductsAction
{
    private const REQUIRED_COLUMNS = ['sku', 'name', 'category_slug', 'price'];

    /** Enough to fix a file, without storing thousands of messages */
    private const MAX_REPORTED_ERRORS = 100;

    public function execute(ProductImport $import): void
    {
        $import->update(['status' => ImportStatus::Processing]);

        $categoryIds = Category::query()->pluck('id', 'slug');
        $header = null;
        $imported = 0;
        $errors = [];

        foreach ($this->openCsv($import) as $lineIndex => $values) {
            // The first line names the columns
            if ($header === null) {
                $header = $this->normalizeHeader($values);
                $missing = array_diff(self::REQUIRED_COLUMNS, $header);

                if ($missing !== []) {
                    $this->fail($import, 'Missing columns: '.implode(', ', $missing).'.');

                    return;
                }

                continue;
            }

            $validator = Validator::make($this->combine($header, $values), $this->rules($categoryIds->keys()->all()));

            if ($validator->fails()) {
                $errors[] = ['row' => $lineIndex + 1, 'messages' => $validator->errors()->all()];

                continue;
            }

            $this->upsert(ProductCsvRowDto::fromValidatedRow($validator->validated()), $categoryIds->all());
            $imported++;
        }

        if ($header === null) {
            $this->fail($import, 'The file is empty.');

            return;
        }

        $import->update([
            'status' => ImportStatus::Completed,
            'total_rows' => $imported + count($errors),
            'imported_rows' => $imported,
            'failed_rows' => count($errors),
            'errors' => array_slice($errors, 0, self::MAX_REPORTED_ERRORS) ?: null,
        ]);
    }

    private function openCsv(ProductImport $import): SplFileObject
    {
        $file = new SplFileObject(Storage::disk('local')->path($import->file_path));
        $file->setFlags(SplFileObject::READ_CSV | SplFileObject::READ_AHEAD | SplFileObject::SKIP_EMPTY | SplFileObject::DROP_NEW_LINE);
        $file->setCsvControl(',', '"', '');

        return $file;
    }

    /**
     * @param  list<string|null>  $header
     * @return list<string> the column names, lowercase, without the BOM some spreadsheet apps add
     */
    private function normalizeHeader(array $header): array
    {
        return array_map(
            fn (mixed $column): string => strtolower(trim(str_replace("\u{FEFF}", '', (string) $column))),
            $header,
        );
    }

    private function fail(ProductImport $import, string $message): void
    {
        $import->update([
            'status' => ImportStatus::Failed,
            'errors' => [['row' => 1, 'messages' => [$message]]],
        ]);
    }

    /**
     * @param  list<string>  $header
     * @param  list<string|null>  $values
     * @return array<string, string>
     */
    private function combine(array $header, array $values): array
    {
        $values = array_slice(array_pad($values, count($header), ''), 0, count($header));

        return array_combine($header, array_map(fn (mixed $value): string => trim((string) $value), $values));
    }

    /**
     * @param  list<string>  $categorySlugs
     * @return array<string, mixed>
     */
    private function rules(array $categorySlugs): array
    {
        return [
            'sku' => ['required', 'string', 'max:64'],
            'name' => ['required', 'string', 'max:255'],
            'category_slug' => ['required', Rule::in($categorySlugs)],
            'price' => ['required', 'decimal:0,2', 'min:0', 'max:9999999'],
            'description' => ['nullable', 'string', 'max:5000'],
        ];
    }

    /** @param array<string, string> $categoryIds category id by slug */
    private function upsert(ProductCsvRowDto $row, array $categoryIds): void
    {
        // Soft-deleted products are matched too (SKUs are unique across the trash) — they're updated, not restored
        Product::withTrashed()->firstOrNew(['sku' => $row->sku])->fill([
            'category_id' => $categoryIds[$row->categorySlug],
            'name' => $row->name,
            'price_cents' => $row->priceCents,
            'description' => $row->description,
        ])->save();
    }
}
