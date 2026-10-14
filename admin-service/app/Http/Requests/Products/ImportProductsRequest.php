<?php

namespace App\Http\Requests\Products;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Http\UploadedFile;

/** A product CSV to import (up to 10 MB). Its rows are checked one by one later, in the queue. */
final class ImportProductsRequest extends FormRequest
{
    /** @return array<string, array<int, string>> */
    public function rules(): array
    {
        return [
            'file' => ['required', 'file', 'mimes:csv,txt', 'max:10240'],
        ];
    }

    public function csvFile(): UploadedFile
    {
        return $this->file('file');
    }
}
