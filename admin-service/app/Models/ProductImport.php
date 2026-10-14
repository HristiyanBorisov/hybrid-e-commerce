<?php

namespace App\Models;

use App\Enums\ImportStatus;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

/**
 * One CSV product import: its progress, and the rows that couldn't be imported.
 *
 * @property string $id UUIDv7
 * @property string $file_name the name of the uploaded file
 * @property string $file_path where it's stored on the "local" disk
 * @property ImportStatus $status
 * @property int $total_rows
 * @property int $imported_rows
 * @property int $failed_rows
 * @property list<array{row: int, messages: list<string>}>|null $errors
 */
class ProductImport extends Model
{
    use HasUuids;

    protected $fillable = ['file_name', 'file_path', 'status', 'total_rows', 'imported_rows', 'failed_rows', 'errors'];

    protected $attributes = [
        'status' => 'pending',
        'total_rows' => 0,
        'imported_rows' => 0,
        'failed_rows' => 0,
    ];

    protected function casts(): array
    {
        return [
            'status' => ImportStatus::class,
            'errors' => 'array',
        ];
    }
}
