<?php

namespace App\Enums;

/** Mirrors the PostgreSQL enum type `import_status`. */
enum ImportStatus: string
{
    case Pending = 'pending';
    case Processing = 'processing';
    case Completed = 'completed';
    case Failed = 'failed';

    public function label(): string
    {
        return ucfirst($this->value);
    }
}
