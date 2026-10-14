<?php

namespace App\Enums;

/** Which products the list shows: the active ones, or the soft-deleted ones (which can be restored). */
enum TrashedFilter: string
{
    case Without = 'without';
    case Only = 'only';

    public function label(): string
    {
        return match ($this) {
            self::Without => 'Active',
            self::Only => 'Trashed',
        };
    }
}
